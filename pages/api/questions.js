// pages/api/questions.js
//
// SHEET_TABS env var format (use || as separator between tabs):
//   History||https://...csv||Geography||https://...csv
//
// Each tab is defined by alternating name and URL pairs separated by ||.
// This avoids the fragile indexOf(':https') approach and handles edge cases
// like tab names that contain colons.

const CATEGORY_MULTIPLIERS = {
  'History': 2,
  'Geography': 2,
  'Logo Quiz': 2,
  'Retro Transfers': 2,
  'Player ID': 2,
  'Club Combo': 2,
  "Who's Missing": 3,
  'Top 5': 3,
};

// How many questions to pick per category each game.
// Must match the number of multiplier slots defined in CATEGORIES on the client.
const QUESTIONS_PER_CATEGORY = 2;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function parseCsv(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    // Handle commas inside quoted fields
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { cols.push(current.trim()); current = ''; continue; }
      current += char;
    }
    cols.push(current.trim());

    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] || ''; });
    return row;
  }).filter(row => row.question && row.answer);
}

/**
 * Parse SHEET_TABS using the || delimiter format:
 *   "History||https://url1||Geography||https://url2"
 *
 * Falls back to legacy indexOf(':https') parsing so existing deployments
 * using the old | format don't break immediately.
 */
function parseSheetTabs(tabsEnv) {
  // New format: pairs separated by ||
  if (tabsEnv.includes('||')) {
    const parts = tabsEnv.split('||').map(p => p.trim());
    const tabs = [];
    for (let i = 0; i < parts.length - 1; i += 2) {
      const name = parts[i];
      const url = parts[i + 1];
      if (name && url) tabs.push({ name, url });
    }
    return tabs;
  }

  // Legacy format: "CategoryName:https://url|CategoryName2:https://url2"
  // Split by | then find the first occurrence of ':https' to separate name from URL.
  return tabsEnv.split('|').map(t => {
    const colonIdx = t.indexOf(':https');
    if (colonIdx === -1) return null;
    return {
      name: t.slice(0, colonIdx).trim(),
      url: t.slice(colonIdx + 1).trim(),
    };
  }).filter(Boolean);
}

export default async function handler(req, res) {
  try {
    const tabsEnv = process.env.SHEET_TABS;
    if (!tabsEnv) return res.status(500).json({ error: 'SHEET_TABS not set' });

    const tabs = parseSheetTabs(tabsEnv);
    if (tabs.length === 0) {
      return res.status(500).json({ error: 'SHEET_TABS parsed to 0 tabs — check format' });
    }

    const results = await Promise.all(
      tabs.map(async ({ name, url }) => {
        try {
          const response = await fetch(url);
          const csv = await response.text();
          const rows = parseCsv(csv);

          // Shuffle the full pool, then take QUESTIONS_PER_CATEGORY distinct questions.
          // Each question is assigned a slotIndex matching its position (0, 1, …)
          // so the client can open them independently without repeat.
          const picked = shuffle(rows).slice(0, QUESTIONS_PER_CATEGORY);

          const questions = picked.map((row, slotIndex) => ({
            question: row.question,
            answer: row.answer,
            image_url: row.image_url || null,
            category: name,
            multiplier: CATEGORY_MULTIPLIERS[name] || 1,
            // slotIndex lets the client key questions as `${category}-${slotIndex}`
            // guaranteeing the same question is shown for that slot every time it's opened.
            slotIndex,
          }));

          return { name, questions };
        } catch (err) {
          console.error(`Failed to fetch tab: ${name}`, err);
          return { name, questions: [] };
        }
      })
    );

    // Build object keyed by category name: { History: [...], Geography: [...], ... }
    const questions = {};
    results.forEach(({ name, questions: qs }) => {
      questions[name] = qs;
    });

    res.status(200).json(questions);
  } catch (err) {
    console.error('questions API error:', err);
    res.status(500).json({ error: 'Failed to load questions' });
  }
}