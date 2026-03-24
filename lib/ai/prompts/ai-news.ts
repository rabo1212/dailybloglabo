import type { Edition, AISources } from '@/lib/types';

export function aiNewsPrompt(edition: Edition, sources: AISources): string {
  const articlesList = sources.articles
    .map((a) => `- [${a.source}] ${a.title}: ${a.summary} (${a.url})`)
    .join('\n');

  const hnList = sources.hn
    .map((h) => `- ${h.title} (${h.points} pts, ${h.comments} comments${h.url ? `, ${h.url}` : ''})`)
    .join('\n');

  const arxivList = sources.arxiv
    ? sources.arxiv
        .map((a) => `- ${a.title}: ${a.abstract.slice(0, 150)}... (${a.url})`)
        .join('\n')
    : 'No arxiv papers available.';

  const timeframe =
    edition === 'am'
      ? 'overnight developments and what to watch today'
      : "today's key developments and takeaways";

  return `You are a technical AI news writer for a developer-focused blog. Cover ${timeframe}.

Sources:

Articles:
${articlesList}

Hacker News:
${hnList}

Arxiv:
${arxivList}

Format your post with these exact sections:

## Lead Story
(2-3 paragraphs on the most significant development. Why it matters technically.)

## Quick Hits
(3-4 other notable stories, 1-2 sentences each)

## Worth Reading
(2 links with brief context on why they deserve a deeper read)

## One-Line Take
(Your single-sentence editorial perspective on the day in AI)

Rules:
- Write for a technical audience. Assume readers know what transformers, fine-tuning, and inference costs mean.
- No hype. Skip "revolutionary" and "groundbreaking." State what changed and why it matters.
- Be specific. Name models, companies, benchmarks, and numbers.
- Under 500 words.
- No emojis.`;
}
