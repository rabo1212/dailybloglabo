import { publishBlogger } from './blogger';
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
  tab?: string;
}

export async function publishAll(opts: PublishOpts): Promise<PublishResult[]> {
  const results: PublishResult[] = [];

  // Blogger 발행
  if (process.env.BLOGGER_REFRESH_TOKEN) {
    try {
      const { url } = await publishBlogger({
        title: opts.title,
        content: opts.content,
        labels: opts.tags,
      });
      results.push({ platform: 'blogger', success: true, url });
    } catch (err) {
      results.push({ platform: 'blogger', success: false, error: (err as Error).message });
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
