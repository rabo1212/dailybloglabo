import type { Edition } from '@/lib/types';

interface StockData {
  sp500: { price: string; change: string };
  nasdaq: { price: string; change: string };
  futures?: { sp500: string; nasdaq: string };
  movers: { symbol: string; price: number; change: number; reason?: string }[];
  news: { title: string; summary: string; url: string }[];
}

export function stocksPrompt(edition: Edition, data: StockData): string {
  const moversList = data.movers
    .map((m) => `- ${m.symbol}: $${m.price.toFixed(2)} (${m.change > 0 ? '+' : ''}${m.change.toFixed(2)}%)${m.reason ? ` - ${m.reason}` : ''}`)
    .join('\n');

  const newsList = data.news
    .map((n) => `- ${n.title}: ${n.summary} (${n.url})`)
    .join('\n');

  const futuresInfo = data.futures
    ? `\nFutures: S&P 500 ${data.futures.sp500}, Nasdaq ${data.futures.nasdaq}`
    : '';

  const timeContext =
    edition === 'am'
      ? 'pre-market conditions and what to watch during the trading session'
      : "today's trading session recap and after-hours developments";

  return `You are a stock market analyst writing for a tech-savvy audience. Cover ${timeContext}.

Market Data:
- S&P 500: ${data.sp500.price} (${data.sp500.change})
- Nasdaq: ${data.nasdaq.price} (${data.nasdaq.change})${futuresInfo}

Movers:
${moversList}

News:
${newsList}

Format your post with these exact sections:

## Market Overview
(2-3 sentences on index performance, breadth, and overall tone)

## Movers & Shakers
(Notable stock moves with context. Focus on tech and AI-related names.)

## Macro Watch
(Any macro factors driving markets: rates, Fed, jobs, geopolitics)

## ${edition === 'am' ? "Today's Watch" : "Tomorrow's Watch"}
(${edition === 'am' ? 'Key events and levels to watch during the session' : 'What to watch for in the next session'})

Rules:
- Factual, not advisory. Report what happened and why, not what to do about it.
- Use specific tickers, prices, and percentages.
- Focus on tech and AI-adjacent stocks when possible.
- Under 500 words.
- No emojis.`;
}
