import { getOpenAIClient } from './client';

/**
 * Generate or enhance JSON-LD content using OpenAI
 */
export async function generateJSONLDContent(
  prompt: string,
  context?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const openai = getOpenAIClient();

  const systemPrompt = `You are a JSON-LD content generator. Generate valid JSON-LD structured data based on the user's request. Return only valid JSON without markdown code blocks.`;

  const userPrompt = context
    ? `Context: ${JSON.stringify(context, null, 2)}\n\nRequest: ${prompt}`
    : prompt;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content generated');
  }

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

/**
 * Enhance existing JSON-LD content
 */
export async function enhanceJSONLDContent(
  existingContent: Record<string, unknown>,
  enhancementPrompt: string,
): Promise<Record<string, unknown>> {
  return generateJSONLDContent(enhancementPrompt, existingContent);
}

