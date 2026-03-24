import Replicate from 'replicate';
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
  if (!process.env.REPLICATE_API_TOKEN) {
    return '';
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  const style = TAB_STYLES[tab];
  const prompt = `${style}, representing: ${title}, editorial cover art, high quality, 16:9`;

  const output = await replicate.run('black-forest-labs/flux-schnell', {
    input: {
      prompt,
      aspect_ratio: '16:9',
      output_format: 'webp',
    },
  });

  // flux-schnell returns an array of URLs or a ReadableStream
  const imageUrl = Array.isArray(output) ? output[0] : output;

  if (!imageUrl) {
    return '';
  }

  // Download the image
  const response = await fetch(
    typeof imageUrl === 'string' ? imageUrl : imageUrl.url
  );
  const buffer = Buffer.from(await response.arrayBuffer());

  // Save to public directory
  const dir = path.join(process.cwd(), 'public', 'images', 'posts', tab);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `${date}-${edition}.webp`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, buffer);

  return `/images/posts/${tab}/${filename}`;
}
