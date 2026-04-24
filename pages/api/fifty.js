// pages/api/fifty.js
// Generates a close, deceptive 50/50 option — not an obvious wrong answer.
// The distractor should be plausible enough to make a knowledgeable player hesitate.

import Anthropic from '@anthropic-ai/sdk';
import { rateLimit } from '../../lib/rateLimit';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const limiter = rateLimit({ windowMs: 60_000, maxRequests: 60 });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!limiter.check(req)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  const { sheetAnswer, category, questionContext } = req.body;

  if (!sheetAnswer || typeof sheetAnswer !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid sheetAnswer' });
  }

  const correct = sheetAnswer.split('|')[0];

  const prompt = `You are generating a 50/50 lifeline for a football pub quiz. Your job is to create ONE distractor that is genuinely hard to distinguish from the correct answer — the kind that makes even knowledgeable football fans second-guess themselves.

CATEGORY: ${category || 'General'}
QUESTION: ${questionContext || ''}
CORRECT ANSWER: ${correct}

Rules for the distractor:
- Same entity type (player → player, year → year, club → club, country → country)
- Plausible in the same context (e.g. if the answer is a Champions League winner, the distractor should also be a plausible Champions League winner)
- Close in time, region, or era — not randomly famous
- NOT a variant spelling or abbreviation of the correct answer
- NOT obviously wrong (avoid world-famous alternatives that everyone knows are different)
- If the answer is a number/year, use one that is close (e.g. off by 1–3 years, or a nearby round number)
- If the answer is a player, pick someone from the same era/position/league who had a similar role
- Aim for 40–60% confusion rate among football enthusiasts

Return ONLY valid JSON, no markdown, no explanation:
{"options": ["${correct}", "<your distractor here>"]}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    const clean = raw.replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(clean);

    if (
      !parsed.options ||
      !Array.isArray(parsed.options) ||
      parsed.options.length < 2
    ) {
      throw new Error('Unexpected response shape');
    }

    // Randomise order so correct answer is not always first
    if (Math.random() > 0.5) parsed.options.reverse();

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('fifty.js error:', err);
    return res.status(200).json({ options: [correct, 'Άλλη επιλογή'] });
  }
}