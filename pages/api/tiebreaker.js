// pages/api/tiebreaker.js
// Generates a single hard football 50/50 style tiebreaker question on demand.
// The question itself is structured as a choice between two very close options —
// not a free-text buzzer question.
//
// Response shape:
// {
//   question: "Which club did Roberto Carlos play for before joining Real Madrid?",
//   options: ["Internazionale", "AC Milan"],   // always exactly 2, shuffled
//   correctIndex: 0                             // index of the correct option
// }

import Anthropic from '@anthropic-ai/sdk';
import { rateLimit } from '../../lib/rateLimit';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const limiter = rateLimit({ windowMs: 60_000, maxRequests: 20 });

const SYSTEM_PROMPT = `You are a football trivia expert writing tiebreaker questions for a pub quiz. 

Your task: generate ONE hard 50/50 football question where both options are genuinely plausible — even knowledgeable fans should be unsure. The question must have exactly two options, only one of which is correct.

Guidelines for difficulty:
- Ask about specific stats, years, or transfers that are easy to confuse
- Both options should be real, credible football facts (not obviously absurd)
- Good examples: "Who scored in the 1994 World Cup final — Romario or Bebeto?", "Did Ronaldo join Man Utd in 2003 or 2004?", "Which club did Seedorf NOT win the Champions League with — Ajax or Inter?"
- Avoid questions where one option is obviously famous and the other obscure
- Avoid questions about Greek football unless both options are equally well-known internationally
- The two options should be the same type (both players, both years, both clubs, etc.)

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "question": "the question text",
  "options": ["option A", "option B"],
  "correctIndex": 0
}

correctIndex is 0 if options[0] is correct, 1 if options[1] is correct.`;

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  if (!limiter.check(req)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: 'Generate a hard 50/50 football tiebreaker question. Make it genuinely difficult — both options should be believable.',
        },
      ],
    });

    const raw = msg.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    const clean = raw.replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(clean);

    // Validate shape
    if (
      typeof parsed.question !== 'string' ||
      !Array.isArray(parsed.options) ||
      parsed.options.length !== 2 ||
      (parsed.correctIndex !== 0 && parsed.correctIndex !== 1)
    ) {
      throw new Error('Invalid response shape from Claude');
    }

    // Randomly flip options so correctIndex isn't always 0
    if (Math.random() > 0.5) {
      parsed.options = [parsed.options[1], parsed.options[0]];
      parsed.correctIndex = parsed.correctIndex === 0 ? 1 : 0;
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error('tiebreaker.js error:', err);

    // Fallback hardcoded question if Claude fails
    const fallback = {
      question: 'Ποια χρονιά κέρδισε η Ελλάδα το Euro;',
      options: ['2004', '2008'],
      correctIndex: 0,
    };
    return res.status(200).json(fallback);
  }
}
