import { getAllPosts } from '@/lib/utils';
import { TAB_CONFIG } from '@/lib/types';

export async function GET() {
  const posts = getAllPosts().slice(0, 50);
  const siteUrl = 'https://dailybloglabo.vercel.app';

  const items = posts.map(post => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/${post.tab}/${post.slug}</link>
      <description>${escapeXml(post.summary)}</description>
      <category>${TAB_CONFIG[post.tab].label}</category>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <guid>${siteUrl}/${post.tab}/${post.slug}</guid>
    </item>`).join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DAYLOG_EV</title>
    <link>${siteUrl}</link>
    <description>Automated multi-channel news blog powered by AI</description>
    <language>en</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
