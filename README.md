Birthday microsite

Flow:
index.html (Scene 1) -> scene2.html (Page 2: memories gallery) -> scene3.html (Page 3: a wish, unfolded + reply form)

## What changed (security fix)

scene3.html used to have a live Telegram bot token and chat ID hardcoded
directly in client-side JavaScript — anyone opening the page's dev tools or
"view source" could read them and send messages as your bot. That's fixed:

- The reply form now POSTs to `/api/feedback`, a serverless function.
- The Telegram token, chat ID, and Mongo connection string live only in
  environment variables (`.env` locally, Vercel env vars in production) —
  never in a file that ships to the browser.
- `/api/feedback` saves every reply to MongoDB (best-effort) and forwards
  it to your Telegram chat.

**Important:** the old token was exposed in the original file, so treat it
as compromised. Regenerate it with @BotFather on Telegram (`/mybots` ->
your bot -> API Token -> Revoke current token) and put the new value in
your env vars.

## Local development

```
npm install
cp .env.example .env   # then fill in real values, or use the .env already here
npm i -g vercel        # if you don't have the Vercel CLI
vercel dev
```

`vercel dev` serves the static pages and runs `/api/feedback.js` locally so
you can test the whole flow (including Mongo + Telegram) before deploying.

## Environment variables

Set these in Vercel: Project -> Settings -> Environment Variables (add to
Production, Preview, and Development).

| Key | Required | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | yes | From @BotFather |
| `TELEGRAM_CHAT_ID` | yes | Your personal chat ID (e.g. from @userinfobot) |
| `MONGODB_URI` | no | MongoDB Atlas connection string. If unset, replies still reach Telegram, they just aren't stored. |
| `MONGODB_DB_NAME` | no | Defaults to `happy_birthday` |

## Deploying to Vercel (free tier)

1. Push this folder to a GitHub repo (`.env` is git-ignored, so your
   secrets won't be committed).
2. Import the repo in Vercel -> New Project.
3. Add the environment variables above in the Vercel dashboard.
4. Deploy. Vercel auto-detects `index.html` and the `api/` folder as a
   serverless function — no extra config needed.

## Adding photos

scene2.html has 6 gallery rows waiting for images (`data-img=""`), under
`section.projects`:

1. SMOOTHEST — Aurora Rebrand, 2026
2. CUTEST — Nurturing, 2026
3. BLOSSOM — Metaphor, 2025
4. FUNNIEST YET CUTEST — Sunflower, 2025
5. IMMERSIVE — Sakura, 2025
6. BOLD — Expressive, 2024

Drop image files into `assets/images/` and set each row's `data-img`
attribute to the path, e.g. `data-img="assets/images/aurora.jpg"` — the
existing script already wires that up for both the thumbnail and the
floating cursor preview.

## Assets

- assets/4110947.mp4
- assets/music.mp3
- fonts/Hugh is Life Personal Use .ttf
- fonts/Zaslia.otf
