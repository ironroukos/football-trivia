import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { question, sheetAnswer, userAnswer, category, verifyLive } = req.body;

  const prompt = `You are an impartial football trivia judge.

CATEGORY: ${category}
QUESTION: ${question}
ACCEPTED ANSWER(S): ${sheetAnswer}
USER'S ANSWER: ${userAnswer}

Rules:
- Accept answers in Greek OR English, handle transliterations.
- Accept distinctive surnames (Mbappé, Ronaldo).
- Reject close-but-wrong (Ronaldinho ≠ Ronaldo).
- Be forgiving on accents, casing, punctuation.
- ${verifyLive
    ? 'Time-sensitive: if the database answer is outdated per your knowledge, set flagOutdated=true.'
    : 'Trust the database answer as ground truth.'}

Respond with ONLY valid JSON:
{"correct": true|false, "canonical": "canonical answer", "note": "short reason in Greek", "flagOutdated": false}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    const clean = raw.replace(/^```json\s*|\s*```$/g, '');
    res.status(200).json(JSON.parse(clean));
  } catch (err) {
    const norm = (s) => s.toLowerCase().trim().replace(/[.,'"]/g, '');
    const accepted = sheetAnswer.split('|').map(norm);
    const correct = accepted.some((a) => a === norm(userAnswer));
    res.status(200).json({
      correct,
      canonical: sheetAnswer.split('|')[0],
      note: 'Offline fallback match.',
      flagOutdated: false,
    });
  }
}