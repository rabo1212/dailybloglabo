import fs from 'fs';
import path from 'path';
import type { Tab } from '@/lib/types';

const NANOBANANA_API_KEY = process.env.NANOBANANA_API_KEY;
const NANOBANANA_URL = 'https://api.nanobanana.com/v1/images/generate';

export async function generateCoverImage(
  tab: Tab,
  title: string,
  date: string,
  imagePrompt: string,
): Promise<string> {
  if (!NANOBANANA_API_KEY) {
    console.log('[image-gen] NANOBANANA_API_KEY 없음, 이미지 건너뜀');
    return '';
  }

  if (!imagePrompt) {
    console.log('[image-gen] 이미지 프롬프트 없음, 건너뜀');
    return '';
  }

  const prompt = `${imagePrompt}, no text, no letters, no words, no numbers, no signs, no charts`;

  try {
    const response = await fetch(NANOBANANA_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NANOBANANA_API_KEY}`,
      },
      body: JSON.stringify({
        prompt,
        model: 'gemini-2.5-flash-image',
        aspect_ratio: '16:9',
        num_images: 1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[image-gen] API 에러 ${response.status}: ${errText.slice(0, 200)}`);
      return '';
    }

    const data = await response.json();
    const imageUrl = data.images?.[0]?.url || data.url || data.image_url;
    if (!imageUrl) {
      console.log('[image-gen] 응답에 이미지 URL 없음');
      return '';
    }

    const imgResponse = await fetch(imageUrl);
    const buffer = Buffer.from(await imgResponse.arrayBuffer());

    const dir = path.join(process.cwd(), 'public', 'images', 'posts', tab);
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${date}.png`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);

    console.log(`[image-gen] 이미지 저장: ${filepath}`);
    return `/images/posts/${tab}/${filename}`;
  } catch (err) {
    console.error('[image-gen] 실패:', err);
    return '';
  }
}
