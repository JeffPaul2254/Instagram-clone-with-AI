/**
 * controllers/authController.js
 *
 * CHANGES from v2:
 *  • facebookRedirect  — builds the Facebook OAuth dialog URL and
 *    redirects the browser there. A CSRF `state` token is signed with
 *    JWT and sent as a query param (no server-side session needed).
 *  • facebookCallback  — handles the redirect from Facebook:
 *      1. Verifies the CSRF state token
 *      2. Exchanges the ?code for a Facebook access token
 *      3. Fetches name, email, picture from the Graph API
 *      4. Finds or creates the local user row
 *      5. Issues our own JWT and redirects to the frontend callback page
 *
 *  All Facebook HTTP calls use Node's built-in https module —
 *  zero new dependencies required.
 *
 * Existing functions (signup, login, getMe) are unchanged.
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const https  = require('https');
const { getDB } = require('../config/db');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Promisified https.get that returns parsed JSON */
function httpsGetJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Invalid JSON from Facebook API')); }
      });
    }).on('error', reject);
  });
}

/**
 * Derive a clean username from a Facebook display name.
 * Strips non-alphanumeric chars, lowercases, truncates to 30 chars.
 * Returns a random suffix fallback if nothing usable remains.
 */
function nameToUsername(name = '') {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
  return base || 'user' + Math.floor(Math.random() * 100000);
}

/**
 * Ensure the candidate username is unique in the DB.
 * Appends a numeric suffix and increments until it finds a free slot.
 */
async function uniqueUsername(db, candidate) {
  let username = candidate;
  let attempt  = 0;
  while (true) {
    const [rows] = await db.execute(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );
    if (!rows.length) return username;
    attempt++;
    username = candidate.slice(0, 26) + attempt; // keep under 30 chars
  }
}

// ── Existing auth handlers (unchanged) ──────────────────────────────────────

// POST /api/auth/signup
async function signup(req, res) {
  try {
    const { username, email, password, full_name } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const db   = getDB();
    const hash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
      [username.toLowerCase().trim(), email.toLowerCase().trim(), hash, full_name || '']
    );
    const token = jwt.sign(
      { id: result.insertId, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: result.insertId, username, email, full_name: full_name || '' } });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      const msg = (err.sqlMessage || '').toLowerCase();
      if (msg.includes('username'))
        return res.status(400).json({ error: 'Username already taken' });
      if (msg.includes('email'))
        return res.status(400).json({ error: 'Email already taken' });
      return res.status(400).json({ error: 'Username or email already taken' });
    }
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'All fields required' });

    const db = getDB();
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email.toLowerCase().trim(), email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    // FB-only accounts have no password — block password login for them
    if (!rows[0].password)
      return res.status(401).json({ error: 'This account uses Facebook login. Please use the Facebook button.' });

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const { password: _, ...user } = rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  try {
    const db = getDB();
    const [rows] = await db.execute(
      'SELECT id, username, email, full_name, bio, avatar, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

// ── Facebook OAuth handlers ──────────────────────────────────────────────────

const FB_AUTH_URL    = 'https://www.facebook.com/v19.0/dialog/oauth';
const FB_TOKEN_URL   = 'https://graph.facebook.com/v19.0/oauth/access_token';
const FB_PROFILE_URL = 'https://graph.facebook.com/v19.0/me';

/**
 * GET /api/auth/facebook
 *
 * Redirects the browser to the Facebook consent screen.
 * A short-lived JWT is used as the `state` CSRF token — no server
 * session storage required, works across multiple Railway instances.
 */
function facebookRedirect(req, res) {
  if (!process.env.FB_APP_ID) {
    return res.status(503).json({ error: 'Facebook login is not configured on this server.' });
  }

  // Sign a 10-minute CSRF state token
  const state = jwt.sign({ csrf: true }, process.env.JWT_SECRET, { expiresIn: '10m' });

  const params = new URLSearchParams({
    client_id:     process.env.FB_APP_ID,
    redirect_uri:  `${process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`}/api/auth/facebook/callback`,
    scope:         'email,public_profile',
    response_type: 'code',
    state,
  });

  res.redirect(`${FB_AUTH_URL}?${params}`);
}

/**
 * GET /api/auth/facebook/callback
 *
 * Facebook redirects here with ?code and ?state after the user
 * approves (or denies) the permission dialog.
 *
 * Flow:
 *  1. Verify CSRF state
 *  2. Exchange code → access token
 *  3. Fetch FB profile (id, name, email, picture)
 *  4. Find or create local user
 *  5. Issue our JWT and redirect frontend to /auth/facebook/callback
 */
async function facebookCallback(req, res) {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  const BACKEND_URL  = process.env.BACKEND_URL  || `http://localhost:${process.env.PORT || 5000}`;
  const redirect_uri = `${BACKEND_URL}/api/auth/facebook/callback`;

  // ── 1. Handle user cancellation ────────────────────────────
  if (req.query.error) {
    console.warn('Facebook OAuth denied by user:', req.query.error_description);
    return res.redirect(`${FRONTEND_URL}/login?error=facebook_cancelled`);
  }

  const { code, state } = req.query;
  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}/login?error=facebook_failed`);
  }

  // ── 2. Verify CSRF state ────────────────────────────────────
  try {
    jwt.verify(state, process.env.JWT_SECRET);
  } catch {
    console.error('Facebook OAuth: invalid CSRF state');
    return res.redirect(`${FRONTEND_URL}/login?error=facebook_failed`);
  }

  try {
    // ── 3. Exchange code for access token ──────────────────────
    const tokenParams = new URLSearchParams({
      client_id:     process.env.FB_APP_ID,
      client_secret: process.env.FB_APP_SECRET,
      redirect_uri,
      code,
    });
    const tokenData = await httpsGetJSON(`${FB_TOKEN_URL}?${tokenParams}`);

    if (!tokenData.access_token) {
      console.error('Facebook token exchange failed:', tokenData);
      return res.redirect(`${FRONTEND_URL}/login?error=facebook_failed`);
    }

    // ── 4. Fetch user profile from Graph API ───────────────────
    // picture.width(400) gives a decent-resolution avatar URL
    const profileParams = new URLSearchParams({
      fields:       'id,name,email,picture.width(400)',
      access_token: tokenData.access_token,
    });
    const profile = await httpsGetJSON(`${FB_PROFILE_URL}?${profileParams}`);

    if (!profile.id) {
      console.error('Facebook profile fetch failed:', profile);
      return res.redirect(`${FRONTEND_URL}/login?error=facebook_failed`);
    }

    const fbId       = profile.id;
    const fbEmail    = profile.email || null;              // null if user denied permission
    const fbName     = profile.name  || '';
    const fbAvatar   = profile.picture?.data?.url || null; // external HTTPS URL

    // ── 5. Find or create local user ──────────────────────────
    const db = getDB();
    let user = null;

    // 5a. Check if an account is already linked to this Facebook ID
    const [byFbId] = await db.execute(
      'SELECT id, username, email, full_name, bio, avatar, created_at FROM users WHERE facebook_id = ?',
      [fbId]
    );
    if (byFbId.length) {
      user = byFbId[0];
    }

    // 5b. Email match → link the existing email/password account
    if (!user && fbEmail) {
      const [byEmail] = await db.execute(
        'SELECT id, username, email, full_name, bio, avatar, created_at FROM users WHERE email = ?',
        [fbEmail.toLowerCase()]
      );
      if (byEmail.length) {
        user = byEmail[0];
        // Link the facebook_id so future logins skip straight to 5a
        await db.execute('UPDATE users SET facebook_id = ? WHERE id = ?', [fbId, user.id]);
      }
    }

    // 5c. Brand-new user — create a record
    if (!user) {
      const baseUsername = nameToUsername(fbName);
      const username     = await uniqueUsername(db, baseUsername);

      // If FB doesn't share an email, store a placeholder that satisfies
      // the UNIQUE constraint without being a real address.
      const email = fbEmail
        ? fbEmail.toLowerCase()
        : `fb_${fbId}@facebook.placeholder`;

      // FB-login users have no local password (column is now nullable)
      // Store the external avatar URL in the avatar column directly.
      const [result] = await db.execute(
        `INSERT INTO users (username, email, password, full_name, avatar, facebook_id)
         VALUES (?, ?, NULL, ?, ?, ?)`,
        [username, email, fbName, fbAvatar, fbId]
      );

      const [newRows] = await db.execute(
        'SELECT id, username, email, full_name, bio, avatar, created_at FROM users WHERE id = ?',
        [result.insertId]
      );
      user = newRows[0];
    }

    // ── 6. Issue our own JWT ───────────────────────────────────
    const appToken = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ── 7. Redirect frontend with token + user in URL ─────────
    // FacebookCallbackPage.js reads these params, calls login(), then
    // removes them from the URL. The params are short-lived in transit
    // (HTTPS only) and cleared from the browser history by the frontend.
    const userParam = encodeURIComponent(JSON.stringify(user));
    return res.redirect(
      `${FRONTEND_URL}/auth/facebook/callback?token=${appToken}&user=${userParam}`
    );

  } catch (err) {
    console.error('Facebook OAuth callback error:', err);
    return res.redirect(`${FRONTEND_URL}/login?error=facebook_failed`);
  }
}

module.exports = { signup, login, getMe, facebookRedirect, facebookCallback };