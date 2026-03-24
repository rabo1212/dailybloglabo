import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Post, PostFrontmatter, Tab, Lang } from './types';

const CONTENT_DIR = path.join(process.cwd(), 'content/posts');

export function getAllPosts(lang?: Lang): Post[] {
  const tabs: Tab[] = ['devlog', 'ai', 'crypto', 'stocks', 'hot'];
  const posts: Post[] = [];

  for (const tab of tabs) {
    const tabDir = path.join(CONTENT_DIR, tab);
    if (!fs.existsSync(tabDir)) continue;

    const files = fs.readdirSync(tabDir).filter(f => f.endsWith('.mdx'));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(tabDir, file), 'utf-8');
      const { data, content } = matter(raw);
      const slug = file.replace('.mdx', '');
      // Posts without lang field are treated as 'en' for backwards compatibility
      const postLang: Lang = (data as PostFrontmatter).lang || 'en';
      posts.push({ ...(data as PostFrontmatter), lang: postLang, slug, content });
    }
  }

  const sorted = posts.sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return a.edition === 'pm' ? -1 : 1;
  });

  if (lang) {
    return sorted.filter(p => (p.lang || 'en') === lang);
  }
  return sorted;
}

export function getPostsByTab(tab: Tab, lang?: Lang): Post[] {
  return getAllPosts(lang).filter(p => p.tab === tab);
}

export function getPost(tab: Tab, slug: string): Post | undefined {
  const tabDir = path.join(CONTENT_DIR, tab);
  const filePath = path.join(tabDir, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return undefined;

  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return { ...(data as PostFrontmatter), slug, content };
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function todayStr(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}
