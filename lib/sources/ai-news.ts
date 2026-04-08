interface HNStory {
  title: string;
  url?: string;
  score: number;
  descendants: number;
}

interface AISources {
  articles: { source: string; title: string; summary: string; url: string }[];
  hn: { title: string; points: number; comments: number; url?: string }[];
  arxiv?: { title: string; abstract: string; url: string }[];
}

const TIMEOUT = 2000;

const AI_KEYWORDS = ['ai', 'gpt', 'llm', 'openai', 'anthropic', 'claude', 'gemini', 'machine learning',
  'deep learning', 'neural', 'transformer', 'diffusion', 'language model', 'chatbot'];

function matchesAI(title: string): boolean {
  const lower = title.toLowerCase();
  return AI_KEYWORDS.some((kw) => lower.includes(kw));
}

async function fetchTavily(): Promise<AISources['articles']> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query: 'AI news today LLM updates',
        max_results: 8,
        search_depth: 'basic',
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const results = (data.results || []) as { title: string; content: string; url: string }[];

    return results.map((r) => ({
      source: 'tavily',
      title: r.title,
      summary: r.content?.slice(0, 200) || '',
      url: r.url,
    }));
  } catch {
    return [];
  }
}

async function fetchHNAI(): Promise<AISources['hn']> {
  try {
    const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json', {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!topRes.ok) return [];

    const ids: number[] = await topRes.json();
    const top30 = ids.slice(0, 30);

    const stories = await Promise.all(
      top30.map(async (id): Promise<HNStory | null> => {
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
      .filter((s): s is HNStory => s !== null && matchesAI(s.title))
      .slice(0, 10)
      .map((s) => ({
        title: s.title,
        points: s.score,
        comments: s.descendants || 0,
        url: s.url,
      }));
  } catch {
    return [];
  }
}

async function fetchArxiv(): Promise<NonNullable<AISources['arxiv']>> {
  try {
    const url = 'https://export.arxiv.org/api/query?search_query=cat:cs.AI&sortBy=submittedDate&sortOrder=descending&max_results=5';
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return [];

    const xml = await res.text();
    const entries: NonNullable<AISources['arxiv']> = [];

    const entryBlocks = xml.split('<entry>').slice(1);
    for (const block of entryBlocks) {
      const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/\s+/g, ' ').trim() || '';
      const abstract = block.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.replace(/\s+/g, ' ').trim().slice(0, 300) || '';
      const link = block.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || '';

      if (title) entries.push({ title, abstract, url: link });
    }

    return entries;
  } catch {
    return [];
  }
}

export async function fetchAINews(): Promise<AISources> {
  const [articles, hn, arxiv] = await Promise.all([fetchTavily(), fetchHNAI(), fetchArxiv()]);
  return { articles, hn, arxiv };
}
