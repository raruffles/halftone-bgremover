import { GoogleGenAI } from '@google/genai';

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 2, delayMs = 1000): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err?.status === 503 ||
        err?.status === 429 ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand');
      if (isRetryable && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-gemini-api-key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const customKey = event.headers['x-gemini-api-key'] || event.headers['X-Gemini-Api-Key'];
    const apiKey = customKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Chave GEMINI_API_KEY não configurada no Netlify. Configure em Site configuration > Environment variables.',
        }),
      };
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });

    const body = JSON.parse(event.body || '{}');
    const { prompt, imageBase64, styleType } = body;

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

    const response = await callWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents.length === 1 ? contents[0].text : { parts: contents },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
        },
      })
    );

    const text = response.text || '{}';
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { description: text };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, recommendation: parsed }),
    };
  } catch (error: any) {
    console.error('Netlify AI Process Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Erro ao processar com Gemini' }),
    };
  }
};
