import { markdownToHtml } from './markdown-to-html';

const NAVER_BLOG_API = 'https://openapi.naver.com/blog/writePost.json';

interface NaverPublishOpts {
  title: string;
  content: string;
  tags?: string[];
}

export async function publishNaver(opts: NaverPublishOpts): Promise<{ url: string }> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET 미설정');
  }

  const htmlContent = markdownToHtml(opts.content);

  const params = new URLSearchParams({
    title: opts.title,
    contents: htmlContent,
  });

  const response = await fetch(NAVER_BLOG_API, {
    method: 'POST',
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`네이버 API 에러 ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const url = data.message?.result?.blogUrl || '';

  console.log(`[naver] 발행 완료: ${url}`);
  return { url };
}
