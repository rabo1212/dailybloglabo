import Anthropic from '@anthropic-ai/sdk';

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

export async function generatePost(
  systemPrompt: string,
  userPrompt: string,
  lang?: 'en' | 'ko'
): Promise<string> {
  const client = getClient();

  // Prepend Korean instruction when lang is 'ko'
  let finalSystemPrompt = systemPrompt;
  if (lang === 'ko') {
    finalSystemPrompt = 'Write entirely in Korean (한국어). Use natural Korean writing style, not translated-sounding Korean. Avoid awkward direct translations from English.\n\n' + systemPrompt;
  }

  if (!client) {
    return `[MOCK] This is a mock post generated without an API key.\n\nSystem prompt received: ${finalSystemPrompt.slice(0, 100)}...\n\nUser prompt received: ${userPrompt.slice(0, 100)}...`;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      system: finalSystemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    });

    const block = message.content[0];
    if (block.type === 'text') {
      return block.text;
    }
  } catch (err) {
    console.error('[claude] API error:', err);
    return `[ERROR] Failed to generate post. Check API key.`;
  }

  return '';
}
