import { publishTistory } from './tistory';
import { publishNaver } from './naver';

export interface PublishResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
}

export interface PublishOpts {
  title: string;
  content: string;
  tags?: string[];
}

export async function publishAll(opts: PublishOpts): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  // 티스토리 발행
  if (process.env.TISTORY_ACCESS_TOKEN) {
    try {
      const { url } = await publishTistory({
        title: opts.title,
        content: opts.content,
        tags: opts.tags,
      });
      results.push({ platform: 'tistory', success: true, url });
    } catch (err) {
      results.push({ platform: 'tistory', success: false, error: (err as Error).message });
    }
  }

  // 네이버 발행
  if (process.env.NAVER_CLIENT_ID) {
    try {
      const { url } = await publishNaver({
        title: opts.title,
        content: opts.content,
        tags: opts.tags,
      });
      results.push({ platform: 'naver', success: true, url });
    } catch (err) {
      results.push({ platform: 'naver', success: false, error: (err as Error).message });
    }
  }

  return results;
}
