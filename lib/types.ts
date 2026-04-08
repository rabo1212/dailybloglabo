export type Tab = 'health' | 'finance' | 'tech' | 'devlog' | 'trending';
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
  health:   { label: '건강/생활',   color: '#34d399', colorClass: 'text-health' },
  finance:  { label: '재테크/경제', color: '#fbbf24', colorClass: 'text-finance' },
  tech:     { label: '테크/AI',     color: '#22d3ee', colorClass: 'text-tech' },
  devlog:   { label: '개발일지',    color: '#a5a5ff', colorClass: 'text-devlog' },
  trending: { label: '핫토픽',      color: '#fb923c', colorClass: 'text-trending' },
};
