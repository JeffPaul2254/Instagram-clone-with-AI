// ── Shared utility functions ──────────────────────────────────

/**
 * Returns a human-readable time string relative to now.
 * e.g. "just now", "5m", "3h", "2d", "Jan 15"
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Returns a full time string, e.g. "3:45 PM"
 */
export function fullTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats large numbers compactly: 1200 → "1.2K", 1500000 → "1.5M"
 */
export function formatCount(n) {
  n = Number(n) || 0;
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}

/**
 * Returns the full URL for a server-hosted file.
 *
 * CHANGED from v1: reads REACT_APP_API_URL from the environment instead of
 * hardcoding "http://localhost:5000".  Set the variable in your .env file:
 *
 *   REACT_APP_API_URL=http://localhost:5000   ← local dev
 *   REACT_APP_API_URL=https://api.myapp.com   ← production
 *
 * This means you never need to touch source code when deploying.
 */
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export function mediaUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;   // already absolute (e.g. Gravatar)
  return `${API_BASE}${path}`;
}

/**
 * Clamps a string to a max length.
 */
export function clamp(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}
