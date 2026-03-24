import { NextRequest, NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.toLowerCase() || '';
  if (q.length < 2) return NextResponse.json({ posts: [] });

  const posts = getAllPosts();
  const results = posts.filter(p =>
    p.title.toLowerCase().includes(q) ||
    p.summary.toLowerCase().includes(q) ||
    p.content.toLowerCase().includes(q)
  ).slice(0, 20);

  // Don't send full content to client
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const safe = results.map(({ content, ...rest }) => rest);
  return NextResponse.json({ posts: safe });
}
