import type { Edition } from '@/lib/types';

interface CryptoData {
  btc: { price: number; change24h: number };
  eth: { price: number; change24h: number };
  totalMarketCap: string;
  totalVolume: string;
  fearGreed: number;
  topMovers: { name: string; symbol: string; price: number; change: number }[];
  news: { title: string; summary: string; url: string }[];
}

export function cryptoPrompt(edition: Edition, data: CryptoData): string {
  const moversList = data.topMovers
    .map((m) => `- ${m.name} (${m.symbol}): $${m.price.toLocaleString()} (${m.change > 0 ? '+' : ''}${m.change.toFixed(2)}%)`)
    .join('\n');

  const newsList = data.news
    .map((n) => `- ${n.title}: ${n.summary} (${n.url})`)
    .join('\n');

  const timeframe =
    edition === 'am'
      ? 'overnight market moves and what to watch today'
      : "today's market action and closing sentiment";

  return `You are a crypto market analyst writing for a developer-oriented blog. Cover ${timeframe}.

Market Data:
- BTC: $${data.btc.price.toLocaleString()} (${data.btc.change24h > 0 ? '+' : ''}${data.btc.change24h.toFixed(2)}%)
- ETH: $${data.eth.price.toLocaleString()} (${data.eth.change24h > 0 ? '+' : ''}${data.eth.change24h.toFixed(2)}%)
- Total Market Cap: ${data.totalMarketCap}
- 24h Volume: ${data.totalVolume}
- Fear & Greed Index: ${data.fearGreed}/100

Top Movers:
${moversList}

News:
${newsList}

Format your post with these exact sections:

## Market Pulse
(Current state of the market in 2-3 sentences. BTC and ETH price action, overall sentiment.)

## Top Movers
(Notable gainers and losers with context on why they moved)

## News That Matters
(2-3 stories that could actually affect prices or adoption)

## Signal vs Noise
(Your take on what's real signal vs hype in today's market)

Rules:
- Data-driven. Use the actual numbers provided.
- No financial advice. Never say "buy" or "sell."
- Be specific. Name tokens, percentages, and on-chain metrics where relevant.
- Under 500 words.
- No emojis.`;
}
