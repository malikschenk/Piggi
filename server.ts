import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json());

const getAiClient = (customKey?: string) => {
  const apiKey = (customKey && customKey.trim().length > 0) ? customKey.trim() : process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

app.post('/api/chat', async (req, res) => {
  try {
    const { message, context, apiKey } = req.body;
    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const ai = getAiClient(apiKey);
    if (!ai) {
      res.status(400).json({
        error: 'No Gemini API key available. Please add your API Key in Settings > API Key or configure GEMINI_API_KEY.'
      });
      return;
    }

    const systemPrompt = `You are PiggiAI, the smart financial budgeting assistant inside the Piggi web app.
Analyze the user's message (which may be in German, English, etc.) and respond with a helpful, friendly message and executable actions.
Output MUST be a valid JSON object matching this schema:
{
  "reply": "Friendly response string summarizing actions or answering financial questions.",
  "actions": [
    { "action": "action_name", ...params }
  ]
}

Supported Actions in the "actions" array:
1. Balance:
   - {"action": "set_balance", "amount": 500}
   - {"action": "adjust_balance", "amount": -20} (use negative for expenses/outflows, positive for income/top-ups)
2. Monthly Income:
   - {"action": "add_income", "name": "Salary", "amount": 2000}
   - {"action": "edit_income", "name": "Salary", "amount": 2200}
   - {"action": "delete_income", "name": "Salary"}
3. Monthly Expenses:
   - {"action": "add_expense", "name": "Rent", "amount": 800}
   - {"action": "edit_expense", "name": "Rent", "amount": 850}
   - {"action": "delete_expense", "name": "Rent"}
4. Savings Goals:
   - {"action": "add_goal", "name": "MacBook", "amount": 1200}
   - {"action": "edit_goal", "name": "MacBook", "amount": 1400}
   - {"action": "delete_goal", "name": "MacBook"}
5. App Settings:
   - {"action": "set_theme", "theme": "dark" | "light"}
   - {"action": "change_avatar", "initial": "P"}
   - {"action": "change_currency", "currency": "USD" | "EUR" | "JPY"}

CURRENT CONTEXT:
${JSON.stringify(context || {}, null, 2)}

Provide only valid JSON. If no database action is needed, return empty actions array [].`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text?.trim() || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      // Extract JSON if wrapped in markdown block
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        parsedData = JSON.parse(match[0]);
      } else {
        parsedData = { reply: text, actions: [] };
      }
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error?.message || 'Failed to process AI response' });
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
