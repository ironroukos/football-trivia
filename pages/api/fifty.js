import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { sheetAnswer, category, questionContext } = req.body;
  const correct = sheetAnswer.split('|')[0];

  const prompt = `Football trivia 50/50 lifeline.
CATEGORY: ${category}
QUESTION: ${questionContext}
CORRECT ANSWER: ${correct}

Generate TWO options: correct + one plausible wrong distractor (same entity type, not a variant spelling).

Return ONLY JSON: {"options": ["option1", "option2"]}`;

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    const clean = raw.replace(/^```json\s*|\s*```$/g, '');
    const parsed = JSON.parse(clean);
    if (Math.random() > 0.5) parsed.options.reverse();
    res.status(200).json(parsed);
  } catch (err) {
    res.status(200).json({ options: [correct, 'Άλλη επιλογή'] });
  }
}