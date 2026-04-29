import Anthropic from '@anthropic-ai/sdk';
import { normalize } from '../../lib/normalize';
import { rateLimit } from '../../lib/rateLimit';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const limiter = rateLimit({ windowMs: 60_000, maxRequests: 60 });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!limiter.check(req)) {
    return res.status(429).json({ error: 'Too many requests — slow down!' });
  }

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

  // === CLAUDE SDK FALLBACK (fuzzy + live check) ===
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      system: `You are a football quiz answer judge that handles multilingual answers.
You receive a correct answer and a player's answer.
Mark as CORRECT if they refer to the same person/team/thing, even if:
- Different spelling (Cholevas / Cholebas / Holevas / Holebas)
- Greek vs Latin characters (Χολέμπας = Cholevas)
- Phonetic transliteration (Ρονάλντο = Ronaldo)
- Common nickname or abbreviation (Ronaldo = Cristiano Ronaldo)
- Minor typos (1-2 characters off)

Mark as INCORRECT only if it's clearly a different person or thing.

The "canonical" field must be copied EXACTLY from the sheet answer as provided.

Respond ONLY with valid JSON, no markdown:
{
  "correct": true or false,
  "canonical": "exact text from sheet answer",
  "note": "brief reason",
  "flag_outdated": true or false
}`,
      messages: [
        {
          role: 'user',
          content: `Question: ${question}
Sheet answer: ${sheetAnswer}
Player answer: ${userAnswer}
Verify live: ${verifyLive ? 'yes' : 'no'}`,
        },
      ],
    });

    const text = msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    const result = JSON.parse(text.replace(/```json|```/g, '').trim());

    return res.json({
      correct: result.correct ?? false,
      canonical: result.canonical ?? sheetAnswer.split('|')[0],
      note: result.note ?? '',
      flagOutdated: result.flag_outdated ?? false,
    });
  } catch (err) {
    console.error('Verify API error:', err);
    return res.json({
      correct: false,
      canonical: sheetAnswer.split('|')[0],
      note: 'Verification failed, please judge manually',
    });
  }
}
