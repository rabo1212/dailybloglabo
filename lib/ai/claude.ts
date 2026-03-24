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
      system: `You create image prompts that ACCURATELY represent blog article content. Read the article carefully and generate a prompt for the MOST relevant visual scene.

RULES:
- Output ONLY the prompt. No explanations.
- Capture the CORE SUBJECT of the article. If it's about Bitcoin hitting $90K, show Bitcoin. If it's about a robot doing surgery, show that.
- Be SPECIFIC to the article, not generic. Every article should get a unique image.
- People, faces, animals are fine. Be creative with composition.
- Style: photorealistic, editorial photography, DSLR, cinematic lighting, 8k
- NEVER include any text, letters, numbers, signs, labels, or written language in the scene
- NEVER include charts, graphs, data visualizations, or screens showing code
- Under 60 words`,
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
