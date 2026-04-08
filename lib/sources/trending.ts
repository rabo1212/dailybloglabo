interface HNStory {
  title: string;
  url?: string;
  score: number;
  descendants: number;
}

interface TrendingData {
  reddit: { sub: string; title: string; upvotes: number; comments: number; url: string }[];
  hn: { title: string; points: number; url?: string }[];
  trends: { query: string; traffic: string }[];
}

const TIMEOUT = 2000;

async function fetchRedditTop(): Promise<TrendingData['reddit']> {
  try {
    const res = await fetch('https://www.reddit.com/r/all/top/.json?t=day&limit=10', {
      headers: { 'User-Agent': 'dailybloglabo:v1.0 (by /u/dailybloglabo)' },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return [];

    const json = await res.json();
    const children = json?.data?.children || [];

    return children.map((child: { data: {
      subreddit: string; title: string; ups: number;
      num_comments: number; permalink: string;
    } }) => {
      const d = child.data;
      return {
        sub: d.subreddit,
        title: d.title,
        upvotes: d.ups || 0,
        comments: d.num_comments || 0,
        url: `https://reddit.com${d.permalink}`,
      };
    });
  } catch {
    return [];
  }
}

async function fetchHNTop(): Promise<TrendingData['hn']> {
  try {
    const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!topRes.ok) return [];

    const ids: number[] = await topRes.json();
    const top10 = ids.slice(0, 10);

    const stories = await Promise.all(
      top10.map(async (id): Promise<HNStory | null> => {
        try {
          const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            signal: AbortSignal.timeout(TIMEOUT),
          });
          if (!r.ok) return null;
          return r.json();
        } catch {
          return null;
        }
      }),
    );

    return stories
      .filter((s): s is HNStory => s !== null)
      .map((s) => ({ title: s.title, points: s.score, url: s.url }));
  } catch {
    return [];
  }
}

async function fetchGoogleTrends(): Promise<TrendingData['trends']> {
  try {
    const res = await fetch('https://trends.google.com/trending/rss?geo=US', {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return [];

    const xml = await res.text();
    const trends: TrendingData['trends'] = [];

    const items = xml.split('<item>').slice(1);
    for (const item of items.slice(0, 15)) {
      const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || '';
      const traffic = item.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/)?.[1]?.trim() || '';

      if (title) {
        trends.push({ query: title, traffic: traffic || 'N/A' });
      }
    }

    return trends;
  } catch {
    return [];
  }
}

export async function fetchTrendingData(): Promise<TrendingData> {
  const [reddit, hn, trends] = await Promise.all([
    fetchRedditTop(),
    fetchHNTop(),
    fetchGoogleTrends(),
  ]);

  return { reddit, hn, trends };
}
