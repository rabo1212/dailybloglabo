import { fal } from '@fal-ai/client';
import fs from 'fs';
import path from 'path';
import type { Tab, Edition } from '@/lib/types';

const TAB_STYLES: Record<Tab, string> = {
  devlog:
    'abstract minimal dark aesthetic, glowing purple circuit lines on black background, geometric shapes, bokeh lights',
  ai: 'abstract neural network nodes connected by glowing cyan lines, dark background, particles floating, depth of field',
  crypto:
    'abstract golden geometric shapes floating in dark space, hexagonal grid pattern, warm gold and green ambient light',
  stocks:
    'abstract green and red light streaks on dark background, smooth flowing curves, minimal geometric shapes, bokeh',
  hot: 'abstract warm orange energy waves radiating outward on dark background, dynamic motion blur, glowing particles',
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
  const prompt = `${style}, editorial cover art, high quality, cinematic lighting, absolutely no text, no letters, no words, no numbers, no characters, no writing, no symbols, pure abstract visual only`;

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

    // Download the image
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Detect actual format from content-type or URL
    const contentType = response.headers.get('content-type') || '';
    let ext = 'jpg';
    if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg';

    // Save to public directory
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
