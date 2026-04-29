// lib/normalize.js
// Single source of truth for answer normalization.
// Used by both pages/index.js (client-side offline check) and pages/api/verify.js (server-side).

export const greekToLatin = {
  'α':'a','β':'b','γ':'g','δ':'d','ε':'e','ζ':'z','η':'i',
  'θ':'th','ι':'i','κ':'k','λ':'l','μ':'m','ν':'n','ξ':'x',
  'ο':'o','π':'p','ρ':'r','σ':'s','ς':'s','τ':'t','υ':'y',
  'φ':'f','χ':'ch','ψ':'ps','ω':'o',
  'Α':'a','Β':'b','Γ':'g','Δ':'d','Ε':'e','Ζ':'z','Η':'i',
  'Θ':'th','Ι':'i','Κ':'k','Λ':'l','Μ':'m','Ν':'n','Ξ':'x',
  'Ο':'o','Π':'p','Ρ':'r','Σ':'s','Τ':'t','Υ':'y',
  'Φ':'f','Χ':'ch','Ψ':'ps','Ω':'o',
};

/**
 * Normalizes an answer string for comparison:
 * - Strips accents (Raúl → Raul)
 * - Lowercases
 * - Transliterates Greek to Latin
 * - Collapses whitespace
 */
export function normalize(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')       // remove accent marks
    .toLowerCase()
    .trim()
    .split('').map(c => greekToLatin[c] || c).join('')  // Greek → Latin
    .replace(/[.\-'_,]/g, '')              // remove dots, dashes, apostrophes
    .replace(/\s*\d+([.,]\d+)?\s*/g, '')  // remove numbers (π.χ. "13.290")
    .replace(/\s+/g, ' ')                 // collapse whitespace
    .trim();
}
