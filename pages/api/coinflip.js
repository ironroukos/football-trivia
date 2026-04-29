export default async function handler(req, res) {
  const url = process.env.SHEET_Coin_Flip;
  if (!url) return res.status(500).json({ error: 'SHEET_Coin_Flip not set' });

  try {
    const r = await fetch(url);
    const csv = await r.text();
    const lines = csv.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return res.status(500).json({ error: 'Empty sheet' });

    // Τυχαία ερώτηση (εκτός header)
    const idx = Math.floor(Math.random() * (lines.length - 1)) + 1;
    const cols = lines[idx].split(',').map(s => s.replace(/^"|"$/g, '').trim());

    // Columns: question, answer
    res.json({ q: cols[0], answer: cols[1] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
