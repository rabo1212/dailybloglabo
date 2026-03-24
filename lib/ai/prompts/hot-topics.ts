import type { Edition, TrendingData } from '@/lib/types';

export function hotTopicsPrompt(edition: Edition, data: TrendingData): string {
  const redditList = data.reddit
    .map((r) => `- r/${r.sub}: "${r.title}" (${r.upvotes} upvotes, ${r.comments} comments, ${r.url})`)
    .join('\n');

  const hnList = data.hn
    .map((h) => `- ${h.title} (${h.points} pts${h.url ? `, ${h.url}` : ''})`)
    .join('\n');

  const trendsList = data.trends
    .map((t) => `- "${t.query}" (${t.traffic})`)
    .join('\n');

  const timeContext =
    edition === 'am'
      ? "what blew up overnight and what's building momentum"
      : "today's biggest moments and what's still trending";

  return `You are a culture and tech writer covering ${timeContext} for a developer audience that lives online.

Trending Sources:

Reddit Hot Posts:
${redditList}

Hacker News Top:
${hnList}

Google Trends:
${trendsList}

Format your post with these exact sections:

## The Main Character
(The single biggest story or moment dominating conversation. 2-3 paragraphs with context.)

## Also Trending
(3-4 other things people are talking about, 1-2 sentences each)

## Internet Corner
(One weird, funny, or surprisingly interesting thing from the trending data)

## Why It Matters
(Brief editorial connecting today's noise to a bigger pattern or trend)

Rules:
- Witty but not try-hard. Dry humor over forced jokes.
- Link to sources where relevant.
- Add cultural commentary. Why do people care about this?
- Under 500 words.
- No emojis.`;
}
