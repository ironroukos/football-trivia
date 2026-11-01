// lib/score.js
// Helpers for the "Guess the Score" category.
// NOTE: normalize() strips digits, so scores must NOT go through it.

/**
 * Parses "4-0", "4 - 0", "4:0", "4–0" into [4, 0]. Returns null if no two numbers found.
 */
export function parseScore(str) {
  const m = String(str || '').match(/(\d+)\D+(\d+)/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10)];
}

export function sameScore(a, b) {
  const x = parseScore(a);
  const y = parseScore(b);
  return !!x && !!y && x[0] === y[0] && x[1] === y[1];
}

/**
 * Splits a free-text list of scorers typed by the player.
 * Accepts comma, semicolon, pipe, slash, "+", "&", " και ", " and ".
 */
export function splitNames(str) {
  return String(str || '')
    .split(/\s*[,;|/+&]\s*|\s+(?:και|and)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}
