import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors    from 'cors';

const app  = express();
const PORT = 3001;

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json());

// ── Use openrouter/free as primary — it auto-selects any available free model
const MODELS = [
  'openrouter/free',                          // auto-picks best available free model
  'deepseek/deepseek-chat:free',              // DeepSeek V3 free
  'deepseek/deepseek-r1:free',               // DeepSeek R1 free
  'meta-llama/llama-3.3-70b-instruct:free',  // Llama 3.3 70B free
  'qwen/qwen3-8b:free',                      // Qwen3 8B free
];

async function callOpenRouter(prompt) {
  let lastError = '';

  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}`);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type':  'application/json',
          'HTTP-Referer':  'http://localhost:3001',
          'X-Title':       'PrintPOS Analytics',
        },
        body: JSON.stringify({
          model,
          messages:   [{ role: 'user', content: prompt }],
          max_tokens: 250,
        }),
      });

      if (response.status === 429) {
        console.warn(`Rate limited on ${model}, trying next...`);
        lastError = 'Rate limited';
        continue;
      }

      if (response.status === 404) {
        console.warn(`Model not found: ${model}, trying next...`);
        lastError = 'Model not found';
        continue;
      }

      if (!response.ok) {
        const err = await response.json();
        console.error(`Error on ${model}:`, err?.error?.message ?? err);
        lastError = err?.error?.message ?? 'Unknown error';
        continue;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim() ?? '';

      if (text) {
        console.log(`✓ Got insight from: ${model}`);
        return text;
      }

      console.warn(`Empty response from ${model}, trying next...`);

    } catch (err) {
      console.error(`Exception on ${model}:`, err);
      lastError = String(err);
    }
  }

  throw new Error(`All models failed. Last error: ${lastError}`);
}

// ── AI Insight endpoint ──────────────────────────────────────
app.post('/api/ai-insight', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt' });
  }

  try {
    const text = await callOpenRouter(prompt);
    res.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('AI insight failed:', message);

    // Return 200 with fallback text so the frontend still shows something
    res.json({
      text: 'AI insight is temporarily unavailable due to rate limits. Please try again in a few minutes.',
    });
  }
});

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`AI backend running on http://localhost:${PORT}`);
});