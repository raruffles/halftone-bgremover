import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));

// Server-side Gemini client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API: AI Process / Style Advice for DTF & DTG Separation
app.post('/api/ai/process', async (req, res) => {
  try {
    const { prompt, imageBase64, styleType } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({
        error: 'Chave GEMINI_API_KEY não configurada no servidor. Usando processamento local avançado.',
      });
    }

    // Call Gemini 3.8 Flash for intelligent DTF/DTG prepress analysis
    const systemPrompt = `Você é um engenheiro de pré-impressão especialista em separação de cores para estamparia DTF (Direct to Film), DTG (Direct to Garment) e Serigrafia.
Seu objetivo é analisar a imagem e/ou a solicitação do usuário e retornar os parâmetros ideais de separação em JSON estrito.
Os parâmetros são:
- lpi: number (15, 22.5, 30, 45, 55 - linhas por polegada ideais para a trama e tecido)
- angle: number (22.5, 45, 60)
- pattern: "circle" | "ellipse" | "diamond" | "square" | "line"
- contrast: number (entre 0.8 e 2.5)
- brightness: number (entre -50 e 50)
- shadowInput: number (0 a 100, ponto de preto para eliminar a caixa preta)
- highlightInput: number (150 a 255, ponto de branco)
- gamma: number (0.6 a 1.8)
- knockoutBlack: boolean (true se deve eliminar o fundo preto da estampa para mesclar com o tecido da camiseta)
- edgeChoke: number (0 a 3, estrangulamento da base branca para evitar névoa branca/white haze)
- inkColor: string hex (cor da retícula se for monocromática/spot, ex: "#D4A359", "#FFFFFF", "#00E5FF", etc.)
- description: string (explicação técnica concisa em português)`;

    const userPrompt = `Solicitação de separação DTF/DTG: ${prompt || 'Otimizar para estampa DTF em camiseta preta com remoção de fundo e transição suave de retícula'}. Modo: ${styleType || 'dtf-standard'}. Retorne apenas JSON.`;

    const contents: any[] = [];
    if (imageBase64) {
      const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

      contents.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }
    contents.push({ text: userPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents.length === 1 ? contents[0].text : { parts: contents },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { description: text };
    }

    res.json({ success: true, recommendation: parsed });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar com Gemini' });
  }
});

// API: AI Upscaler & High-Res Vector/Art Enhancer
app.post('/api/ai/upscale', async (req, res) => {
  try {
    const { imageBase64, prompt } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY não configurada' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: `Re-render this artwork with razor sharp edges, clean solid blacks, high contrast, perfect for DTF t-shirt printing without blurry edges: ${prompt || 'High resolution crisp vector look, isolated on pure black or transparent background'}`,
          },
        ],
      },
    });

    let imageUrl = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'Nenhuma imagem foi gerada pelo modelo' });
    }

    res.json({ success: true, imageUrl });
  } catch (err: any) {
    console.error('Error in AI upscale:', err);
    res.status(500).json({ error: err.message || 'Falha ao aprimorar imagem' });
  }
});

// API: AI Background Removal / Subject Isolation
app.post('/api/ai/remove-bg', async (req, res) => {
  try {
    const { imageBase64 } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(400).json({ error: 'GEMINI_API_KEY não configurada' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const mimeMatch = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          {
            text: 'Isolate the main foreground subject with a clean, solid, pure black background (RGB 0, 0, 0), removing any messy background, halos, noise, or gradients so that black knockout turns it completely transparent.',
          },
        ],
      },
    });

    let imageUrl = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'Nenhuma imagem foi gerada pelo modelo' });
    }

    res.json({ success: true, imageUrl });
  } catch (err: any) {
    console.error('Error in AI remove-bg:', err);
    res.status(500).json({ error: err.message || 'Falha ao remover fundo com IA' });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`DTX Halftone Studio Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
