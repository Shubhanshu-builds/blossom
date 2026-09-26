// /api/feedback.js
// Vercel serverless function (Node.js runtime).
// Receives the birthday-page reply, stores it in MongoDB, and forwards
// it to a Telegram chat. All secrets come from environment variables
// (set them in Vercel Project Settings -> Environment Variables, or in
// a local .env file for `vercel dev`). Nothing here is hardcoded.

const { MongoClient } = require('mongodb');

const {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  MONGODB_URI,
  MONGODB_DB_NAME = 'happy_birthday',
} = process.env;

// Reuse the Mongo connection across warm invocations instead of
// reconnecting on every request.
let cachedClient = null;
async function getDb() {
  if (!MONGODB_URI) return null; // Mongo is optional; feedback still reaches Telegram without it.
  if (cachedClient) return cachedClient.db(MONGODB_DB_NAME);
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  cachedClient = client;
  return client.db(MONGODB_DB_NAME);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const message = (body.message || '').toString().trim();

    if (!message) {
      return res.status(400).json({ ok: false, error: 'Empty message' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ ok: false, error: 'Message too long' });
    }

    // 1. Store in MongoDB (best-effort — don't fail the request if this errors).
    try {
      const db = await getDb();
      if (db) {
        await db.collection('replies').insertOne({
          message,
          createdAt: new Date(),
          userAgent: req.headers['user-agent'] || null,
        });
      }
    } catch (dbErr) {
      console.error('Mongo insert failed:', dbErr);
    }

    // 2. Forward to Telegram (this is the part the user actually needs to see).
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars');
      return res.status(500).json({ ok: false, error: 'Server not configured' });
    }

    const tgUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const tgResp = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: `New Birthday Feedback:\n\n${message}`,
      }),
    });

    if (!tgResp.ok) {
      const detail = await tgResp.text().catch(() => '');
      console.error('Telegram send failed:', tgResp.status, detail);
      return res.status(502).json({ ok: false, error: 'Telegram delivery failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unexpected error in /api/feedback:', err);
    return res.status(500).json({ ok: false, error: 'Unexpected server error' });
  }
};
