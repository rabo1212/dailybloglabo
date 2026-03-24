import { fal } from '@fal-ai/client';
import fs from 'fs';
import path from 'path';
import type { Tab, Edition } from '@/lib/types';

const FALLBACK_STYLES: Record<Tab, string> = {
  devlog: 'A developer workspace at night, multiple monitors glowing with code, purple ambient lighting, coffee cup, cinematic wide shot',
  ai: 'A futuristic control room with holographic displays showing neural network diagrams, blue and cyan lighting, cinematic',
  crypto: 'A high-tech trading desk with golden Bitcoin hologram floating above, dark moody lighting, cinematic wide angle',
  stocks: 'Wall Street at golden hour, financial district skyscrapers reflecting sunset, green and red ticker lights, cinematic',
  hot: 'A bustling city intersection at night from above, neon signs, crowds of people, warm orange street lights, cinematic aerial shot',
};

export async function generateCoverImage(
  tab: Tab,
  title: string,
  date: string,
  edition: Edition,
  imagePrompt?: string
): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.log('[image-gen] No FAL_KEY found, skipping image generation');
    return '';
  }

  fal.config({ credentials: falKey });

  // Use AI-generated prompt if available, otherwise fallback
  const prompt = imagePrompt
    ? `${imagePrompt}, photorealistic, editorial photography, cinematic lighting, 16:9, no text no letters no words no writing`
    : `${FALLBACK_STYLES[tab]}, photorealistic, editorial photography, no text no letters no words`;

  try {
    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        image_size: 'landscape_16_9',
        num_images: 1,
      },
    });

    const imageData = result.data?.images?.[0];
    const imageUrl = imageData?.url;
    if (!imageUrl) {
      console.log('[image-gen] No image URL in response');
      return '';
    }

    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const contentType = response.headers.get('content-type') || '';
    let ext = 'jpg';
    if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('png')) ext = 'png';

    const dir = path.join(process.cwd(), 'public', 'images', 'posts', tab);
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${date}-${edition}.${ext}`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);

    console.log(`[image-gen] Saved cover image: ${filepath}`);
    return `/images/posts/${tab}/${filename}`;
  } catch (err) {
    console.error('[image-gen] Failed:', err);
    return '';
  }
}
