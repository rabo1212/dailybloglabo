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

  let finalSystemPrompt = systemPrompt;
  if (lang === 'ko') {
    finalSystemPrompt = `한국어(Korean)로 작성하세요. 번역체가 아닌 자연스러운 한국어 문체를 사용하세요. "~입니다" 체와 "~이다" 체를 적절히 섞어 쓰세요. 딱딱한 보고서가 아닌, 블로그 글처럼 읽히게 쓰세요.\n\n` + systemPrompt;
  }

  if (!client) {
    return `[MOCK] This is a mock post generated without an API key.\n\nSystem prompt received: ${finalSystemPrompt.slice(0, 100)}...\n\nUser prompt received: ${userPrompt.slice(0, 100)}...`;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 4000,
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

/**
 * Generate an image prompt based on article content.
 * Uses Claude to create a descriptive, visual scene prompt.
 */
export async function generateImagePrompt(
  articleContent: string,
  tab: string
): Promise<string> {
  const client = getClient();
  if (!client) return '';

  try {
    const message = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      system: `You generate image prompts for a blog cover photo. Read the article and describe ONE visual scene that represents the topic.

STRICT RULES:
- Output ONLY the prompt text. No explanations.
- Describe a real-world PHOTO scene or ILLUSTRATION scene. Choose one style:
  * Photo style: "editorial photograph of [scene], DSLR, shallow depth of field, natural lighting"
  * Illustration style: "digital illustration of [scene], clean vector style, modern flat design"
- Describe OBJECTS, ENVIRONMENTS, PEOPLE, ANIMALS — concrete things you can photograph
- ABSOLUTELY ZERO text, letters, numbers, words, characters, signs, labels, screens with text, monitors with code, books with text, newspapers — NOTHING with any written language
- No charts, graphs, candlestick patterns, or data visualizations (these always produce garbled text)
- Under 80 words`,
      messages: [
        { role: 'user', content: `Article category: ${tab}\n\nArticle:\n${articleContent.slice(0, 1500)}` },
      ],
    });

    const block = message.content[0];
    if (block.type === 'text') {
      return block.text.trim();
    }
  } catch (err) {
    console.error('[claude] Image prompt generation failed:', err);
  }

  return '';
}
