import Papa from 'papaparse';

export default async function handler(req, res) {
  try {
    const csv = await fetch(process.env.SHEET_CSV_URL).then((r) => r.text());
    const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });

    const grouped = parsed.data.reduce((acc, row) => {
      if (!row.category) return acc;
      acc[row.category] = acc[row.category] || [];

      const base = {
        id: row.id,
        type: row.type || 'text',
        q: row.question || '',
        a: row.answer || '',
        multiplier: parseInt(row.multiplier, 10) || 1,
        verifyLive: row.verify_live === 'TRUE',
      };

      if (row.type === 'logo' || row.type === 'imageText' || row.type === 'lineup') {
        base.imageUrl = row.image_url;
      }
      if (row.type === 'transfer') {
        base.from = row.from_team;
        base.to = row.to_team;
        base.year = row.year;
      }
      if (row.type === 'careerTable') {
        try { base.career = JSON.parse(row.career_json); } catch { base.career = []; }
      }
      if (row.type === 'lineup') {
        base.visiblePlayers = (row.visible_players || '').split(',').map((s) => s.trim()).filter(Boolean);
        base.missingPosition = row.missing_position || '';
      }
      if (row.type === 'top5') {
        base.answers = (row.top5_answers || '').split(',').map((s) => s.trim()).filter(Boolean);
      }

      acc[row.category].push(base);
      return acc;
    }, {});

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}