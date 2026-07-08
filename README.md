# Football Trivia 

https://github.com/ironroukos/football-trivia

A Next.js pub quiz app with 8 football categories, power-ups, and AI-powered answer verification via Claude.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

## Environment Variables

Create a `.env.local` file:

```env
# Anthropic API key — used for fuzzy answer verification
ANTHROPIC_API_KEY=sk-ant-...

# Google Sheets CSV tabs (use || as separator between name/URL pairs)
# Format: CategoryName||https://csv-url||CategoryName2||https://csv-url2
SHEET_TABS=History||https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0||Geography||https://...
```

### SHEET_TABS format

Each category is defined as a `Name||URL` pair, with multiple pairs separated by `||`:

```
History||https://...||Geography||https://...||Logo Quiz||https://...
```

The category name must exactly match one of the 8 categories configured in `pages/index.js`.

## Project Structure

```
pages/
  index.js          — Main game UI (all React components)
  api/
    questions.js    — Fetches & shuffles questions from Google Sheets CSVs
    verify.js       — Claude-powered answer verification with local normalize fallback
lib/
  normalize.js      — Shared Greek/Latin transliteration + accent stripping
  rateLimit.js      — Simple in-memory IP rate limiter for API routes
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Anthropic API](https://docs.anthropic.com)
