import fs from 'fs';
import path from 'path';
import type { Tab } from '@/lib/types';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

export async function generateCoverImage(
  tab: Tab,
  title: string,
  date: string,
  imagePrompt: string,
): Promise<string> {
  const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
  if (!GOOGLE_AI_API_KEY) {
    console.log('[image-gen] GOOGLE_AI_API_KEY 없음, 이미지 건너뜀');
    return '';
  }

  if (!imagePrompt) {
    console.log('[image-gen] 이미지 프롬프트 없음, 건너뜀');
    return '';
  }

  const prompt = `Generate a blog cover image: ${imagePrompt}, no text, no letters, no words, no numbers, no signs, no charts. Photorealistic, editorial photography style, 16:9 aspect ratio.`;

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[image-gen] Gemini API 에러 ${response.status}: ${errText.slice(0, 200)}`);
      return '';
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

    if (!imagePart) {
      console.log('[image-gen] 응답에 이미지 없음');
      return '';
    }

    const buffer = Buffer.from(imagePart.inlineData.data, 'base64');

    const dir = path.join(process.cwd(), 'public', 'images', 'posts', tab);
    fs.mkdirSync(dir, { recursive: true });

    const ext = imagePart.inlineData.mimeType.includes('png') ? 'png' : 'jpg';
    const filename = `${date}.${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);

    console.log(`[image-gen] 이미지 저장: ${filepath}`);
    return `/images/posts/${tab}/${filename}`;
  } catch (err) {
    console.error('[image-gen] 실패:', err);
    return '';
  }
}
