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

const CATEGORY_TYPES = {
  'History':          'text',
  'Geography':        'text',
  'Logo Quiz':        'logo',
  'Retro Transfers':  'transfer',
  'Player ID':        'imageText',
  'Club Combo':       'clubcombo',
  "Who's Missing":    'whomissing',
  'Top 5':            'top5',
};

const QUESTIONS_PER_CATEGORY = 2;

const CATEGORY_ENVS = [
  { name: 'History',          url: process.env.SHEET_History },
  { name: 'Geography',        url: process.env.SHEET_Geography },
  { name: 'Logo Quiz',        url: process.env.SHEET_Logo_Quiz },
  { name: 'Retro Transfers',  url: process.env.SHEET_Retro_Transfers },
  { name: 'Player ID',        url: process.env.SHEET_Player_ID },
  { name: 'Club Combo',       url: process.env.SHEET_Club_Combo },
  { name: "Who's Missing",    url: process.env.SHEET_Whos_Missing },
  { name: 'Top 5',            url: process.env.SHEET_Top_5 },
];

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
  }).filter(row => {
    return (row.question || row.period) && (row.answer || row.player);
  });
}

function buildQuestion(row, name, slotIndex) {
  const type = CATEGORY_TYPES[name] || 'text';
  const multiplier = CATEGORY_MULTIPLIERS[name] || 1;

  const isImageUrl = (str) => str && str.trim().startsWith('http');

  switch (type) {

    case 'transfer':
  // Sheet: period | year | from | to | player
  return {
    type,
    category: name,
    multiplier,
    slotIndex,
    question: row.period  || row.question || '',
    answer:   row.player  || row.answer   || '',
    from:     row.from    || '',
    to:       row.to      || '',
    year:     row.year    || '',
    image_url: null,
  };
      
    case 'whomissing':
    case 'imageText':
    case 'logo':
      // Sheet: question (= image URL) | answer
      // Το question είναι το URL της εικόνας
      return {
        type,
        category: name,
        multiplier,
        slotIndex,
        question:  isImageUrl(row.question) ? '' : row.question,
        answer:    row.answer || '',
        image_url: isImageUrl(row.question) ? row.question.trim() : null,
      };

    case 'top5':
    case 'clubcombo':
    case 'text':
    default:
      // Sheet: question | answer
      return {
        type,
        category: name,
        multiplier,
        slotIndex,
        question:  row.question || '',
        answer:    row.answer   || '',
        image_url: null,
      };
  }
}

export default async function handler(req, res) {
  try {
    const tabs = CATEGORY_ENVS.filter(c => c.url);

    if (tabs.length === 0) {
      return res.status(500).json({ error: 'No category URLs set — check Vercel env variables' });
    }

    const results = await Promise.all(
      tabs.map(async ({ name, url }) => {
        try {
          const response = await fetch(url);
          const csv = await response.text();
          const rows = parseCsv(csv);
          const picked = shuffle(rows).slice(0, QUESTIONS_PER_CATEGORY);
          const questions = picked.map((row, slotIndex) => buildQuestion(row, name, slotIndex));
          return { name, questions };
        } catch (err) {
          console.error(`Failed to fetch tab: ${name}`, err);
          return { name, questions: [] };
        }
      })
    );

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
