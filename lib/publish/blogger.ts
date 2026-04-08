import { markdownToHtml } from './markdown-to-html';

const BLOGGER_API = 'https://www.googleapis.com/blogger/v3';

interface BloggerPublishOpts {
  title: string;
  content: string;
  labels?: string[];
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.BLOGGER_CLIENT_ID;
  const clientSecret = process.env.BLOGGER_CLIENT_SECRET;
  const refreshToken = process.env.BLOGGER_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('BLOGGER_CLIENT_ID, BLOGGER_CLIENT_SECRET, BLOGGER_REFRESH_TOKEN 미설정');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`토큰 갱신 실패: ${data.error_description || data.error}`);
  }

  return data.access_token;
}

export async function publishBlogger(opts: BloggerPublishOpts): Promise<{ postId: string; url: string }> {
  const blogId = process.env.BLOGGER_BLOG_ID;
  if (!blogId) {
    throw new Error('BLOGGER_BLOG_ID 미설정');
  }

  const accessToken = await getAccessToken();
  const htmlContent = markdownToHtml(opts.content);

  const response = await fetch(`${BLOGGER_API}/blogs/${blogId}/posts/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      kind: 'blogger#post',
      blog: { id: blogId },
      title: opts.title,
      content: htmlContent,
      labels: opts.labels || [],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Blogger API 에러 ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const postId = data.id || 'unknown';
  const url = data.url || '';

  console.log(`[blogger] 발행 완료: ${url}`);
  return { postId, url };
}
