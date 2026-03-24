export type Tab = 'ai' | 'crypto' | 'stocks' | 'hot' | 'devlog';
export type Edition = 'am' | 'pm';
export type Lang = 'en' | 'ko';

export interface PostFrontmatter {
  title: string;
  tab: Tab;
  edition: Edition;
  date: string;
  summary: string;
  image?: string;
  lang?: Lang;
}

export interface Post extends PostFrontmatter {
  slug: string;
  content: string;
}

export const TAB_CONFIG: Record<Tab, { label: string; color: string; colorClass: string }> = {
  ai: { label: 'AI News', color: '#22d3ee', colorClass: 'text-ainews' },
  crypto: { label: 'Crypto', color: '#fbbf24', colorClass: 'text-crypto' },
  stocks: { label: 'Stocks', color: '#34d399', colorClass: 'text-stocks' },
  hot: { label: 'Hot Topics', color: '#fb923c', colorClass: 'text-hottopic' },
  devlog: { label: 'My Dev Log', color: '#a5a5ff', colorClass: 'text-devlog' },
};

// Data source types
export interface GitHubEvent {
  type: string;
  repo: { name: string };
  payload: Record<string, unknown>;
  created_at: string;
}

export interface HNStory {
  title: string;
  url?: string;
  score: number;
  descendants: number;
}

export interface AISources {
  articles: { source: string; title: string; summary: string; url: string }[];
  hn: { title: string; points: number; comments: number; url?: string }[];
  arxiv?: { title: string; abstract: string; url: string }[];
}

export interface CryptoData {
  btc: { price: number; change24h: number };
  eth: { price: number; change24h: number };
  totalMarketCap: string;
  totalVolume: string;
  fearGreed: number;
  topMovers: { name: string; symbol: string; price: number; change: number }[];
  news: { title: string; summary: string; url: string }[];
}

export interface StockData {
  sp500: { price: string; change: string };
  nasdaq: { price: string; change: string };
  futures?: { sp500: string; nasdaq: string };
  movers: { symbol: string; price: number; change: number; reason?: string }[];
  news: { title: string; summary: string; url: string }[];
}

export interface TrendingData {
  reddit: { sub: string; title: string; upvotes: number; comments: number; url: string }[];
  hn: { title: string; points: number; url?: string }[];
  trends: { query: string; traffic: string }[];
}
