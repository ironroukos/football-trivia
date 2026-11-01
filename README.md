# Football Trivia

https://footyquiz.vercel.app

A Next.js pub quiz for two teams, with 12 football categories, a coin-flip start, a category draft, power-ups, and AI-powered answer verification via Claude.

## Game flow

1. **Team names**
2. **Coin flip** – each team guesses a number; the closest one wins.
3. **Category draft** – the coin-flip winner picks first, then teams alternate until 8 categories are chosen. Every category is a free pick. The coin-flip winner also plays first.
4. **Play** – each category has 2 questions. Teams alternate turns.
   - **Pass** is available on every question: 0 points, the correct answer is shown.
   - **×2** (one per team): a correct answer gives double points. A wrong answer or a pass gives 0 and the ×2 is spent anyway.

## Getting Started

```
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

## Environment Variables

Create a `.env.local` file. Each category reads one published Google Sheets CSV URL
(`File → Share → Publish to web → the tab → CSV`). A category without a URL (or with fewer than 2 valid rows) is greyed out in the draft.

```
ANTHROPIC_API_KEY=sk-ant-...      # fuzzy answer verification

SHEET_Coin_Flip=https://...
SHEET_History=https://...
SHEET_Geography=https://...
SHEET_Logo_Quiz=https://...
SHEET_Player_ID=https://...
SHEET_Manager_ID=https://...
SHEET_Whos_Missing=https://...
SHEET_Top_5=https://...
SHEET_Retro_Transfers=https://...
SHEET_Higher_Lower=https://...
SHEET_Club_Combo=https://...
SHEET_Lost_Files=https://...
SHEET_Guess_the_Score=https://...
```

## Sheet format

Headers are case-insensitive. One question per row. Avoid line breaks and double quotes inside cells, and avoid commas in the Coin Flip sheet (its parser is simpler than the others).
Use `|` to separate multiple values inside one cell.

| Tab | Columns | Notes |
|---|---|---|
| Coin Flip | `question`, `answer` | `answer` is a plain number, e.g. `11635` |
| History, Geography | `question`, `answer` | `answer` may list alternatives: `Pelé\|Pele` |
| Logo Quiz, Player ID, Manager ID, Lost Files | `question`, `answer`, `img_url` | `img_url` is a direct image link |
| Who's Missing | `question`, `answer`, `img_url` | `answer` may list alternatives with `\|` |
| Top 5 | `question`, `answer` | exactly 5 answers separated by `\|`, **in ranking order** (1st place first) |
| Retro Transfers | `period`, `year`, `from`, `to`, `player` | shown as "period year", then "from ▶ to"; `player` is the answer |
| Higher/Lower | `subject`, `values`, `answer` | `values` = two options split by `&`, `\|` or `vs`; `answer` must be **exactly** the option with the higher value (the "higher" one, always) |
| Club Combo | `question`, `answer` | `question` e.g. `Arsenal, Roma`; `answer` is the list of players, separated by `\|` |
| Guess the Score | `question`, `answer`, `scorers` | `question` = the match; `answer` = score in the same order as the teams, e.g. `4-0`; `scorers` = one name per scorer separated by `\|` (empty for 0-0) |

### Guess the Score scoring

- Correct score → **1 point**
- Correct score **and** all scorers (none missing, none extra) → **2 points**
- Wrong score → 0 (scorers are not checked)

Scorers are typed in one field, separated by commas. Spelling, Greek/Latin and nicknames are handled by the same matching as other categories.

## Project Structure

```
pages/
  index.js          — Game UI (all React components)
  api/
    questions.js    — Fetches & shuffles questions from the Google Sheets CSVs
    coinflip.js     — Random question for the coin flip
    verify.js       — Claude-powered answer verification with local normalize fallback
lib/
  normalize.js      — Shared Greek/Latin transliteration + accent stripping (removes digits!)
  score.js          — Score parsing and scorer-list splitting for Guess the Score
  rateLimit.js      — Simple in-memory IP rate limiter for API routes
```

## Adding a category

1. Add it to `ALL_CATEGORIES` in `pages/index.js` (name, multipliers, colors).
2. Add its type, multiplier and `SHEET_...` env var in `pages/api/questions.js`.
3. If it needs a new question UI, add a component and a `case` in `QuestionModal`.
