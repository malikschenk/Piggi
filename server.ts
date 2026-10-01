import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());

const isHackClubKey = (key: string): boolean => {
  const k = key.trim();
  return k.startsWith('sk-hc-') || k.startsWith('hc-') || k.startsWith('sk-');
};

const getAiClient = (customKey?: string) => {
  let rawKey = (customKey && customKey.trim().length > 0) ? customKey.trim() : '';
  rawKey = rawKey.replace(/^['"]|['"]$/g, '').trim();
  if (!rawKey || isHackClubKey(rawKey)) return null;
  return new GoogleGenAI({
    apiKey: rawKey,
  });
};

app.post('/api/chat', async (req, res) => {
  try {
    const { message, context, apiKey } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const effectiveKey = (apiKey && typeof apiKey === 'string' && apiKey.trim().length > 0)
      ? apiKey.trim().replace(/^['"]|['"]$/g, '')
      : (process.env.GEMINI_API_KEY || process.env.API_KEY || '').trim();

    if (!effectiveKey) {
      res.status(400).json({
        error: 'KEY_EMPTY'
      });
      return;
    }

    const systemPrompt = `You are PiggiAI, the intelligent financial budgeting assistant and copilot inside the Piggi web app.
Analyze the user's message (which can be in German, English, or other languages) and respond with a helpful, friendly message and executable actions.

You must output a single valid JSON object matching this schema:
{
  "reply": "Friendly, precise response in the user's language answering their question, giving financial insights, or explaining what was updated.",
  "actions": [
    { "action": "action_name", ...params }
  ]
}

Capabilities & Actions you can execute in the "actions" array:
1. Balance Management:
   - Set balance: {"action": "set_balance", "amount": 1500}
   - Add/Subtract balance: {"action": "adjust_balance", "amount": 50} (positive for adding money/top-ups, negative like -25 for spending/deducting)
2. Monthly Income:
   - Add income: {"action": "add_income", "name": "Salary", "amount": 3000}
   - Edit income: {"action": "edit_income", "name": "Salary", "amount": 3200}
   - Delete income: {"action": "delete_income", "name": "Salary"}
3. Monthly Expenses:
   - Add expense: {"action": "add_expense", "name": "Rent", "amount": 900}
   - Edit expense: {"action": "edit_expense", "name": "Rent", "amount": 950}
   - Delete expense: {"action": "delete_expense", "name": "Rent"}
4. Savings Goals:
   - Add goal: {"action": "add_goal", "name": "MacBook", "amount": 1500}
   - Edit goal: {"action": "edit_goal", "name": "MacBook", "amount": 1800}
   - Delete goal: {"action": "delete_goal", "name": "MacBook"}
5. Settings & Appearance:
   - Theme: {"action": "set_theme", "theme": "dark" | "light"}
   - Avatar Letter: {"action": "change_avatar", "initial": "P"}
   - Currency: {"action": "change_currency", "currency": "USD" | "EUR" | "JPY"}

Financial Intelligence & Queries:
- Statistics & Analysis: Provide clear answers on Savings Rate (%), Monthly Net (Income - Expenses), Total Income, Total Expenses, and budget balance.
- Goal Timelines: If the user asks when they will reach a savings goal (e.g. "Wann erreiche ich mein MacBook Ziel?"), calculate the remaining amount needed and divide by Monthly Net Savings to give the exact number of months and projected completion month/year.
- Future Calculator Projections: If the user asks about their balance on a specific future date (e.g. "Wie viel Geld habe ich im Dezember 2026?"), calculate: Projected Balance = Current Balance + (Months until that date * Monthly Net Savings).
- If the user asks general financial questions or asks for advice, answer politely, informatively, and accurately based on their active budget numbers.
- If no action needs to be executed, return an empty actions array: "actions": [].

CURRENT LIVE BUDGET CONTEXT:
${JSON.stringify(context || {}, null, 2)}

Output ONLY valid JSON.`;

    let lastError: any = null;
    let textResponse: string | null = null;

    if (isHackClubKey(effectiveKey)) {
      const hcModels = [
        'openai/gpt-4o-mini',
        'google/gemini-2.0-flash-001',
        'meta-llama/llama-3.3-70b-instruct',
      ];
      for (const model of hcModels) {
        try {
          const hcRes = await fetch('https://ai.hackclub.com/proxy/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${effectiveKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message },
              ],
              response_format: { type: 'json_object' },
            }),
          });
          if (hcRes.ok) {
            const hcData: any = await hcRes.json();
            const text = hcData.choices?.[0]?.message?.content?.trim();
            if (text) {
              textResponse = text;
              break;
            }
          } else {
            const errBody = await hcRes.text();
            lastError = new Error(`Hack Club AI error: ${errBody}`);
          }
        } catch (err: any) {
          lastError = err;
        }
      }
    } else {
      const ai = getAiClient(effectiveKey);
      const modelsToTry = [
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
      ];

      if (ai) {
        for (const model of modelsToTry) {
          try {
            const res = await ai.models.generateContent({
              model,
              contents: message,
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
              },
            });
            if (res?.text) {
              textResponse = res.text;
              break;
            }
          } catch (err: any) {
            lastError = err;
          }
        }
      }

      if (!textResponse) {
        for (const model of modelsToTry) {
          try {
            const restRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: message }] }],
                generationConfig: { responseMimeType: 'application/json' },
              }),
            });
            if (restRes.ok) {
              const data: any = await restRes.json();
              const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (textOutput) {
                textResponse = textOutput;
                break;
              }
            } else {
              const errBody = await restRes.text();
              lastError = new Error(`Gemini REST error: ${errBody}`);
            }
          } catch (err: any) {
            lastError = err;
          }
        }
      }
    }

    if (!textResponse) {
      throw lastError || new Error('Failed to generate response from AI models');
    }

    const text = (textResponse || '{}').trim();
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        parsedData = { reply: text, actions: [] };
      }
    }

    res.json(parsedData);
  } catch (error: any) {
    const rawMsg = error?.message || '';
    const lower = rawMsg.toLowerCase();
    if (lower.includes('key_empty') || lower.includes('no api key') || lower.includes('kein api-key')) {
      res.status(400).json({ error: 'KEY_EMPTY' });
    } else {
      res.status(500).json({ error: 'GENERAL_ERROR' });
    }
  }
});

const startServer = async () => {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Piggi server running on http://0.0.0.0:${PORT}`);
  });
};

startServer();
