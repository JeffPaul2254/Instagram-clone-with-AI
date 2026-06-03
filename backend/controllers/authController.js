/**
 * controllers/authController.js
 *
 * CHANGES from v3 (Facebook OAuth):
 *  • Added looksLikePhone() and normalisePhone() helpers.
 *  • signup() detects phone vs email input and stores in the right column.
 *  • login() now also matches users.phone so phone-signup users can log in.
 *  • Error messages cover the phone-already-taken duplicate case.
 *
 * Facebook OAuth helpers (facebookRedirect, facebookCallback) are unchanged.
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const https  = require('https');
const { getDB } = require('../config/db');

// ── Phone helpers ─────────────────────────────────────────────────────────────

/**
 * Returns true when the string looks like a phone number.
 * Accepts an optional leading + followed by 7–15 digits (spaces/dashes/parens
 * stripped first).  This covers all real-world international formats.
 */
function looksLikePhone(value) {
  const cleaned = value.replace(/[\s\-().]/g, '');
  return /^\+?\d{7,15}$/.test(cleaned);
}

/** Normalise a phone string: strip spaces / dashes / parens, keep leading + */
function normalisePhone(value) {
  return value.replace(/[\s\-().]/g, '');
}

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

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
async function signup(req, res) {
  try {
    // Frontend sends mobile-number-or-email value under the key `email`
    const { username, email: contactValue, password, full_name } = req.body;

    if (!username || !contactValue || !password)
      return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const db   = getDB();
    const hash = await bcrypt.hash(password, 12);

    const isPhone = looksLikePhone(contactValue.trim());
    let result;

    if (isPhone) {
      const phone = normalisePhone(contactValue.trim());
      [result] = await db.execute(
        'INSERT INTO users (username, phone, password, full_name) VALUES (?, ?, ?, ?)',
        [username.toLowerCase().trim(), phone, hash, full_name || '']
      );
    } else {
      [result] = await db.execute(
        'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
        [username.toLowerCase().trim(), contactValue.toLowerCase().trim(), hash, full_name || '']
      );
    }

    const token = jwt.sign(
      { id: result.insertId, username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id:        result.insertId,
        username,
        email:     isPhone ? null : contactValue.toLowerCase().trim(),
        phone:     isPhone ? normalisePhone(contactValue.trim()) : null,
        full_name: full_name || '',
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      const msg = (err.sqlMessage || '').toLowerCase();
      if (msg.includes('username'))
        return res.status(400).json({ error: 'Username already taken' });
      if (msg.includes('phone'))
        return res.status(400).json({ error: 'Phone number already taken' });
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

    const db        = getDB();
    const input     = email.trim();
    const lower     = input.toLowerCase();
    const normPhone = normalisePhone(input);   // normalise in case user types +91 9876-543210

    // Match email OR username OR phone — whichever was used at signup
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? OR username = ? OR phone = ?',
      [lower, lower, normPhone]
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

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
/**
 * Flow step 1 — "Find your account":
 *  1. Look up the user by email, username, or phone
 *  2. Generate a cryptographically random token (64 hex chars)
 *  3. Store it in password_reset_tokens with a 1-hour expiry
 *  4. Send a reset email via nodemailer
 *
 * SECURITY: Always responds with the same success message whether or not the
 * account exists — prevents user enumeration.
 */
async function forgotPassword(req, res) {
  // Always return success to prevent user enumeration
  const SUCCESS = { ok: true, message: 'If an account with that contact exists, a reset email has been sent.' };

  try {
    const { contact } = req.body;
    if (!contact?.trim()) return res.status(400).json({ error: 'Please enter your mobile number, username or email.' });

    const db        = getDB();
    const input     = contact.trim();
    const lower     = input.toLowerCase();
    const normPhone = normalisePhone(input);

    const [rows] = await db.execute(
      'SELECT id, email, username, full_name FROM users WHERE email = ? OR username = ? OR phone = ?',
      [lower, lower, normPhone]
    );

    // No account found — return success anyway (anti-enumeration)
    if (!rows.length) return res.json(SUCCESS);

    const user = rows[0];

    // Must have an email to receive the reset link
    if (!user.email) return res.json(SUCCESS);

    // ── Generate token ────────────────────────────────────────
    const crypto = require('crypto');
    const token  = crypto.randomBytes(32).toString('hex');   // 64-char hex string

    // Expire in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
      .toISOString().slice(0, 19).replace('T', ' '); // MySQL DATETIME format

    // Invalidate any previous unused tokens for this user
    await db.execute(
      'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0',
      [user.id]
    );

    await db.execute(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );

    // ── Send email ────────────────────────────────────────────
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink    = `${FRONTEND_URL}/reset-password?token=${token}`;
    const displayName  = user.full_name || user.username;

    await sendResetEmail(user.email, displayName, user.username, resetLink);

    return res.json(SUCCESS);

  } catch (err) {
    console.error('forgotPassword error:', err);
    // Still return success — never leak server errors to this endpoint
    return res.json({ ok: true, message: 'If an account with that contact exists, a reset email has been sent.' });
  }
}

// ── POST /api/auth/reset-password ────────────────────────────────────────────
/**
 * Flow step 3 — "Create a Strong Password":
 *  1. Validate the token (exists, not expired, not used)
 *  2. Hash the new password
 *  3. Update users.password
 *  4. Mark the token as used (single-use)
 *  5. Return a fresh JWT so the user is immediately logged in
 */
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;
    if (!token)    return res.status(400).json({ error: 'Reset token is missing.' });
    if (!password) return res.status(400).json({ error: 'Please enter a new password.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const db = getDB();

    // Look up the token — must be unused and not expired
    const [tokens] = await db.execute(
      `SELECT t.*, u.id as uid, u.username, u.email, u.full_name, u.bio, u.avatar
       FROM password_reset_tokens t
       JOIN users u ON t.user_id = u.id
       WHERE t.token = ? AND t.used = 0 AND t.expires_at > NOW()`,
      [token]
    );

    if (!tokens.length)
      return res.status(400).json({ error: 'This password reset link is invalid or has expired. Please request a new one.' });

    const row = tokens[0];

    // Hash the new password and update the user
    const hash = await bcrypt.hash(password, 12);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hash, row.user_id]);

    // Mark token as used — prevents replay
    await db.execute('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [row.id]);

    // Issue a fresh JWT so the user is instantly logged in
    const appToken = jwt.sign(
      { id: row.user_id, username: row.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { uid, user_id, token: _t, expires_at, used, created_at, ...userFields } = row;
    res.json({ token: appToken, user: { ...userFields, id: row.user_id } });

  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// ── Email helper ──────────────────────────────────────────────────────────────
/**
 * Sends the password-reset email.
 * Uses nodemailer with SMTP credentials from environment variables.
 * For Gmail: set EMAIL_USER and EMAIL_PASS (App Password, not account password).
 *
 * Required env vars (add to Railway):
 *   EMAIL_USER  — e.g. yourapp@gmail.com
 *   EMAIL_PASS  — Gmail App Password (16 chars, no spaces)
 *   EMAIL_FROM  — display name + address, e.g. "Instagram Clone <yourapp@gmail.com>"
 *
 * The email mirrors the real Instagram reset email layout shown in the screenshots.
 */
async function sendResetEmail(toEmail, displayName, username, resetLink) {
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const FROM    = process.env.EMAIL_FROM || `Instagram <${process.env.EMAIL_USER}>`;
  const subject = `${username}, we've made it easy to get back on Instagram`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:40px 0;">
    <tr><td align="center">
      <table width="468" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #dbdbdb;border-radius:4px;overflow:hidden;max-width:468px;width:100%;">
        <!-- Header -->
        <tr><td align="center" style="padding:30px 40px 20px;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Instagram_logo.svg/180px-Instagram_logo.svg.png"
               alt="Instagram" width="110" style="display:block;margin:0 auto 20px;" />
          <p style="margin:0;font-size:14px;color:#262626;line-height:1.6;">
            Hi ${displayName},
          </p>
          <p style="margin:12px 0 0;font-size:14px;color:#262626;line-height:1.6;">
            Sorry to hear you're having trouble logging into Instagram.
            We got a message that you forgot your password. If this was you,
            you can get right back into your account or reset your password now.
          </p>
        </td></tr>
        <!-- Log in button -->
        <tr><td align="center" style="padding:10px 40px;">
          <a href="${resetLink}"
             style="display:block;background:#0095f6;color:#fff;text-decoration:none;
                    font-size:14px;font-weight:600;padding:12px 24px;border-radius:4px;
                    text-align:center;">
            Log in as ${username}
          </a>
        </td></tr>
        <!-- Reset button -->
        <tr><td align="center" style="padding:8px 40px 24px;">
          <a href="${resetLink}"
             style="display:block;background:#0095f6;color:#fff;text-decoration:none;
                    font-size:14px;font-weight:600;padding:12px 24px;border-radius:4px;
                    text-align:center;">
            Reset your password
          </a>
        </td></tr>
        <!-- Disclaimer -->
        <tr><td style="padding:0 40px 24px;">
          <p style="margin:0;font-size:13px;color:#8e8e8e;line-height:1.6;">
            If you didn't request a login link or a password reset, you can ignore
            this message and
            <a href="#" style="color:#385185;text-decoration:none;">learn more about why you may have received it</a>.
          </p>
          <p style="margin:12px 0 0;font-size:13px;color:#8e8e8e;line-height:1.6;">
            Only people who know your Instagram password or click the login link
            in this email can log into your account.
          </p>
        </td></tr>
        <!-- Divider -->
        <tr><td style="border-top:1px solid #dbdbdb;padding:16px 40px 8px;text-align:center;">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Meta_Platforms_Inc._logo.svg/200px-Meta_Platforms_Inc._logo.svg.png"
               alt="Meta" width="60" style="opacity:0.6;" />
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:4px 40px 24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#8e8e8e;line-height:1.6;">
            © Instagram. Meta Platforms, Inc., 1601 Willow Road, Menlo Park, CA 94025<br>
            This message was sent to ${toEmail} and intended for ${username}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    FROM,
    to:      toEmail,
    subject,
    html,
    text: `Hi ${displayName},\n\nReset your Instagram password: ${resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
  });
}

module.exports = { signup, login, getMe, facebookRedirect, facebookCallback, forgotPassword, resetPassword };

