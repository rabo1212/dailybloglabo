import { fal } from '@fal-ai/client';
import fs from 'fs';
import path from 'path';
import type { Tab, Edition } from '@/lib/types';

const FALLBACK_STYLES: Record<Tab, string> = {
  devlog: 'editorial photograph of a developer seen from behind sitting at a clean desk with dual monitors, warm lamp light, cozy night workspace, shallow depth of field, cinematic',
  ai: 'editorial photograph of a person seen from behind looking at a large glowing holographic display in a dark room, blue and purple ambient light, cinematic, futuristic',
  crypto: 'editorial photograph of golden Bitcoin coins stacked on a dark reflective marble surface, dramatic rim lighting, shallow depth of field, luxury feel',
  stocks: 'editorial photograph of a modern glass skyscraper financial district at golden hour, a silhouette of a person looking up at the buildings, warm light, wide angle',
  hot: 'editorial photograph of a bustling city intersection at sunset seen from above, distant silhouettes of people crossing, warm golden light, cinematic aerial view',
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
  const noText = 'no text, no letters, no words, no numbers, no signs, no charts, no graphs, no data visualizations';
  const prompt = imagePrompt
    ? `${imagePrompt}, ${noText}`
    : `${FALLBACK_STYLES[tab]}, ${noText}`;

  try {
    const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
      input: {
        prompt,
        image_size: 'landscape_16_9',
        num_images: 1,
        safety_tolerance: '5',
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
