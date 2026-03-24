import { fal } from '@fal-ai/client';
import fs from 'fs';
import path from 'path';
import type { Tab, Edition } from '@/lib/types';

const FALLBACK_STYLES: Record<Tab, string> = {
  devlog: 'editorial photograph of a clean minimal desk with laptop and coffee mug, warm morning light through window, shallow depth of field, cozy workspace',
  ai: 'editorial photograph of a humanoid robot hand reaching toward a human hand, soft blue backlighting, dramatic shallow depth of field, cinematic',
  crypto: 'editorial photograph of a stack of golden coins on a reflective dark surface, dramatic rim lighting, bokeh background, luxury feel',
  stocks: 'editorial photograph of a modern glass skyscraper district at golden hour, warm sun reflections, wide angle, architectural photography',
  hot: 'editorial photograph of a crowded city street at sunset, silhouettes of people walking, warm golden light, street photography style',
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
  const noText = 'absolutely no text, no letters, no words, no numbers, no characters, no writing, no signs, no labels, no charts, no graphs, no screens with text, no code';
  const prompt = imagePrompt
    ? `${imagePrompt}, ${noText}`
    : `${FALLBACK_STYLES[tab]}, ${noText}`;

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
