// pages/api/questions.js

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

// How many questions to pick per category each game
const QUESTIONS_PER_CATEGORY = 2;

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
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

export default async function handler(req, res) {
  try {
    const tabsEnv = process.env.SHEET_TABS;
    if (!tabsEnv) return res.status(500).json({ error: 'SHEET_TABS not set' });

    // Split tabs by | (not comma, since URLs contain commas)
    const tabs = tabsEnv.split('|').map(t => {
      const colonIdx = t.indexOf(':https');
      const name = t.slice(0, colonIdx).trim();
      const url = t.slice(colonIdx + 1).trim();
      return { name, url };
    });

    const results = await Promise.all(
      tabs.map(async ({ name, url }) => {
        try {
          const response = await fetch(url);
          const csv = await response.text();
          const rows = parseCsv(csv);

          const questions = shuffle(rows)
            .slice(0, QUESTIONS_PER_CATEGORY)
            .map(row => ({
              question: row.question,
              answer: row.answer,
              image_url: row.image_url || null,
              category: name,
              multiplier: CATEGORY_MULTIPLIERS[name] || 1,
            }));

          return { name, questions };
        } catch (err) {
          console.error(`Failed to fetch tab: ${name}`, err);
          return { name, questions: [] };
        }
      })
    );

    // Build object keyed by category name
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