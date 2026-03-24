import { fal } from '@fal-ai/client';
import fs from 'fs';
import path from 'path';
import type { Tab, Edition } from '@/lib/types';

const TAB_STYLES: Record<Tab, string> = {
  devlog:
    'minimal dark terminal aesthetic, code on screen, monochrome with purple accent, abstract',
  ai: 'neural network visualization, abstract data flow, dark background, blue and cyan tones, futuristic',
  crypto:
    'abstract blockchain visualization, dark background, gold and green tones, geometric patterns',
  stocks:
    'abstract financial chart visualization, dark background, candlestick patterns, green and red accents',
  hot: 'abstract trending arrows, viral network visualization, dark background, warm orange tones',
};

export async function generateCoverImage(
  tab: Tab,
  title: string,
  date: string,
  edition: Edition
): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    console.log('[image-gen] No FAL_KEY found, skipping image generation');
    return '';
  }

  fal.config({ credentials: falKey });

  const style = TAB_STYLES[tab];
  const prompt = `${style}, representing: ${title}, editorial cover art, high quality, 16:9, no text, no letters`;

  try {
    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        image_size: 'landscape_16_9',
        num_images: 1,
      },
    });

    const imageUrl = result.data?.images?.[0]?.url;
    if (!imageUrl) {
      console.log('[image-gen] No image URL in response');
      return '';
    }

    // Download the image
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Save to public directory
    const dir = path.join(process.cwd(), 'public', 'images', 'posts', tab);
    fs.mkdirSync(dir, { recursive: true });

    const filename = `${date}-${edition}.webp`;
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, buffer);

    console.log(`[image-gen] Saved cover image: ${filepath}`);
    return `/images/posts/${tab}/${filename}`;
  } catch (err) {
    console.error('[image-gen] Failed:', err);
    return '';
  }
}
