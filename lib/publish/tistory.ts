import { markdownToHtml } from './markdown-to-html';

const TISTORY_API = 'https://www.tistory.com/apis/post/write';

interface TistoryPublishOpts {
  title: string;
  content: string;
  tags?: string[];
  category?: string;
}

export async function publishTistory(opts: TistoryPublishOpts): Promise<{ url: string }> {
  const accessToken = process.env.TISTORY_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('TISTORY_ACCESS_TOKEN 미설정');
  }

  const htmlContent = markdownToHtml(opts.content);

  const params = new URLSearchParams({
    access_token: accessToken,
    title: opts.title,
    content: htmlContent,
    published: '1',
  });

  if (opts.category) {
    params.append('category', opts.category);
  }

  if (opts.tags && opts.tags.length > 0) {
    params.append('tag', opts.tags.join(','));
  }

  const response = await fetch(TISTORY_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`티스토리 API 에러 ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();

  if (data.code !== 200) {
    throw new Error(`티스토리 API 에러: ${data.message || 'Unknown error'}`);
  }

  const url = data.url || '';

  console.log(`[tistory] 발행 완료: ${url}`);
  return { url };
}
