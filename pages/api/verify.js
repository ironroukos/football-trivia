// pages/api/verify.js

// === NORMALIZE HELPERS ===
const greekToLatin = {
  'α':'a','β':'b','γ':'g','δ':'d','ε':'e','ζ':'z','η':'i',
  'θ':'th','ι':'i','κ':'k','λ':'l','μ':'m','ν':'n','ξ':'x',
  'ο':'o','π':'p','ρ':'r','σ':'s','ς':'s','τ':'t','υ':'y',
  'φ':'f','χ':'ch','ψ':'ps','ω':'o',
  // Capitals too
  'Α':'a','Β':'b','Γ':'g','Δ':'d','Ε':'e','Ζ':'z','Η':'i',
  'Θ':'th','Ι':'i','Κ':'k','Λ':'l','Μ':'m','Ν':'n','Ξ':'x',
  'Ο':'o','Π':'p','Ρ':'r','Σ':'s','Τ':'t','Υ':'y',
  'Φ':'f','Χ':'ch','Ψ':'ps','Ω':'o',
};

function normalize(str) {
  if (!str) return '';
  return str
    .normalize('NFD')                      // decompose accents: Raúl → Rau + ́l
    .replace(/[\u0300-\u036f]/g, '')       // remove accent marks → Raul
    .toLowerCase()
    .trim()
    .split('').map(c => greekToLatin[c] || c).join('') // Greek → Latin
    .replace(/\s+/g, ' ');                 // collapse multiple spaces
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { question, sheetAnswer, userAnswer, verifyLive } = req.body;

  if (!sheetAnswer || !userAnswer) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // === QUICK LOCAL CHECK (no API call needed) ===
  const acceptedAnswers = sheetAnswer.split('|').map(normalize);
  const normUser = normalize(userAnswer);

  if (acceptedAnswers.includes(normUser)) {
    return res.json({
      correct: true,
      canonical: sheetAnswer.split('|')[0],
      note: 'Matched locally',
    });
  }

  // === CLAUDE API FALLBACK (fuzzy + live check) ===
  try {
    const systemPrompt = `You are a strict football quiz answer judge.
You receive a question, the correct answer from a sheet, and the player's answer.
Your job:
1. Decide if the player's answer is correct (accounting for spelling variations, nicknames, abbreviations).
2. If verify_live is true, also check if the sheet answer might be outdated based on your knowledge.

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "correct": true or false,
  "canonical": "the canonical correct answer",
  "note": "brief reason",
  "flag_outdated": true or false
}`;

    const userPrompt = `Question: ${question}
Sheet answer: ${sheetAnswer}
Player answer: ${userAnswer}
Verify live: ${verifyLive ? 'yes' : 'no'}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    return res.json({
      correct: result.correct ?? false,
      canonical: result.canonical ?? sheetAnswer.split('|')[0],
      note: result.note ?? '',
      flagOutdated: result.flag_outdated ?? false,
    });
  } catch (err) {
    console.error('Verify API error:', err);
    // Fallback: reject if Claude fails (safe default)
    return res.json({
      correct: false,
      canonical: sheetAnswer.split('|')[0],
      note: 'Verification failed, please judge manually',
    });
  }
}