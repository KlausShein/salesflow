import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors    from 'cors';

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── OpenRouter models (existing AI insight endpoint) ─────────
const MODELS = [
  'openrouter/free',
  'deepseek/deepseek-chat:free',
  'deepseek/deepseek-r1:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-8b:free',
];

async function callOpenRouter(prompt) {
  let lastError = '';
  for (const model of MODELS) {
    try {
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
      if (response.status === 429) { lastError = 'Rate limited'; continue; }
      if (response.status === 404) { lastError = 'Model not found'; continue; }
      if (!response.ok) {
        const err = await response.json();
        lastError = err?.error?.message ?? 'Unknown error';
        continue;
      }
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim() ?? '';
      if (text) return text;
    } catch (err) {
      lastError = String(err);
    }
  }
  throw new Error(`All models failed. Last error: ${lastError}`);
}

// ── Gemini chat (robot assistant) ───────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3-flash-preview',
];

// Build a rich system prompt using live business data from the frontend
function buildSystemPrompt(context) {
  const base = `You are a helpful AI assistant built into PrintPOS Pro, a print shop POS and 
financial distribution management system. You help cashiers, managers, and owners with questions 
about daily sales entry, expense tracking, and automatic percentage-based financial distribution 
across six categories: Equity, Rental, Electricity, Water, Share, and Savings.
Keep answers concise and practical. Format numbers with peso sign (₱) and commas.
If asked something outside the app's scope, gently redirect to print shop business topics.`;

  if (!context) return base;

  const { today, summary, recentSales, recentExpenses, distributions } = context;
  const fmt = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  const dataBlock = `

--- LIVE BUSINESS DATA (as of ${today}) ---

SUMMARY:
- Total Sales Today:        ${fmt(summary.totalSalesToday)}
- Total Expenses Today:     ${fmt(summary.totalExpensesToday)}
- Net Income Today:         ${fmt(summary.netIncomeToday)}
- Total Sales This Month:   ${fmt(summary.totalSalesThisMonth)}
- Total Expenses This Month:${fmt(summary.totalExpensesThisMonth)}
- Net Income This Month:    ${fmt(summary.netIncomeThisMonth)}

RECENT SALES (last 10):
${recentSales.length
  ? recentSales.map(s => `  • ${s.display_date ?? s.date}: ${fmt(s.amount)} [distributed: ${fmt(s.distributed)}]${s.notes ? ` — ${s.notes}` : ''} (${s.status ?? 'active'})`).join('\n')
  : '  (no sales records found)'}

RECENT EXPENSES (this month):
${recentExpenses.length
  ? recentExpenses.map(e => `  • ${e.display_date ?? e.date} [${e.category ?? 'General'}] ${fmt(e.amount)}${e.description ? ` — ${e.description}` : ''}`).join('\n')
  : '  (no expense records found)'}

Use this data to answer questions accurately. When asked about totals, trends, or comparisons, 
calculate from the data above and explain your findings clearly.`;

  return base + dataBlock;
}

// In-memory conversation store
const sessions = new Map();

async function callGemini(history, systemPrompt) {
  let lastError = '';
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`Trying Gemini model: ${model}`);
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: history,
          generationConfig: { maxOutputTokens: 500, temperature: 0.7 },
        }),
      });
      if (response.status === 404) { lastError = 'Model not found'; continue; }
      if (response.status === 429) { lastError = 'Rate limited'; continue; }
      if (!response.ok) {
        const err = await response.json();
        lastError = err?.error?.message ?? 'Unknown error';
        continue;
      }
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
      if (text) {
        console.log(`✓ Gemini response from: ${model}`);
        return text;
      }
      lastError = 'Empty response';
    } catch (err) {
      lastError = String(err);
    }
  }
  throw new Error(`All Gemini models failed. Last error: ${lastError}`);
}

app.post('/api/assistant', async (req, res) => {
  const { message, sessionId = 'default', context } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Missing message' });
  }
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not set in .env' });
  }

  // Build system prompt enriched with live data
  const systemPrompt = buildSystemPrompt(context);

  if (!sessions.has(sessionId)) sessions.set(sessionId, []);
  const history = sessions.get(sessionId);
  history.push({ role: 'user', parts: [{ text: message }] });

  try {
    const text = await callGemini(history, systemPrompt);
    history.push({ role: 'model', parts: [{ text }] });
    if (history.length > 40) history.splice(0, 2);
    res.json({ text });
  } catch (err) {
    console.error('Assistant error:', err);
    history.pop(); // remove failed user message
    res.json({ text: 'The AI assistant is temporarily unavailable. Please try again shortly.' });
  }
});

app.delete('/api/assistant/session/:id', (req, res) => {
  sessions.delete(req.params.id);
  res.json({ cleared: true });
});

// ── AI Insight endpoint (existing) ──────────────────────────
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
    res.json({ text: 'AI insight is temporarily unavailable. Please try again in a few minutes.' });
  }
});

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`AI backend running on http://localhost:${PORT}`);
});