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
      system: `You are a strict football quiz answer judge.
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