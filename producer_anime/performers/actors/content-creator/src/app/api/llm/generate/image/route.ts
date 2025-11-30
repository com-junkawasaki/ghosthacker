/**
 * Image Generation API Route
 * LLMを使用した画像生成エンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, modelId, prompt, size = '1024x1024', quality = 'standard', style = 'vivid' } = body;

    if (!provider || !prompt) {
      return NextResponse.json(
        { error: 'provider and prompt are required' },
        { status: 400 }
      );
    }

    // OpenAI DALL-E API
    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: 'OPENAI_API_KEY is not configured' },
          { status: 500 }
        );
      }

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId || 'dall-e-3',
          prompt,
          size: modelId === 'dall-e-3' ? size : undefined,
          quality: modelId === 'dall-e-3' ? quality : undefined,
          style: modelId === 'dall-e-3' ? style : undefined,
          n: modelId === 'dall-e-2' ? 1 : undefined,
          response_format: 'b64_json',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { error: errorData.error?.message || 'OpenAI API error' },
          { status: response.status }
        );
      }

      const data = await response.json();
      const b64Json = data.data?.[0]?.b64_json;

      if (!b64Json) {
        return NextResponse.json(
          { error: 'No image data returned from OpenAI API' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        imageBase64: `data:image/png;base64,${b64Json}`,
      });
    }

    // その他のプロバイダー（fal.ai等）は後で実装
    return NextResponse.json(
      { error: `Unsupported provider: ${provider}` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

