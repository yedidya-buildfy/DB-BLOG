import type { NextRequest } from 'next/server';

import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const {
    apiKey: key,
    model = 'gpt-4o-mini',
    prompt,
    system,
  } = await req.json();

  // Try OpenAI first, then Gemini
  const openaiKey = key || process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!openaiKey && !geminiKey) {
    return NextResponse.json(
      { error: 'Missing API key. Set OPENAI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY.' },
      { status: 401 }
    );
  }

  try {
    let aiModel;

    if (openaiKey) {
      const openai = createOpenAI({ apiKey: openaiKey });
      aiModel = openai(model);
    } else if (geminiKey) {
      const google = createGoogleGenerativeAI({ apiKey: geminiKey });
      aiModel = google('gemini-1.5-flash');
    }

    const result = await generateText({
      abortSignal: req.signal,
      maxOutputTokens: 50,
      model: aiModel!,
      prompt,
      system,
      temperature: 0.7,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(null, { status: 408 });
    }

    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}
