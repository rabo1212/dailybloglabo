interface StockData {
  sp500: { price: string; change: string };
  nasdaq: { price: string; change: string };
  futures?: { sp500: string; nasdaq: string };
  movers: { symbol: string; price: number; change: number; reason?: string }[];
  news: { title: string; summary: string; url: string }[];
}

const TIMEOUT = 2000;

function mockData(): StockData {
  return {
    sp500: { price: '5,234.18', change: '+0.45%' },
    nasdaq: { price: '16,428.82', change: '+0.62%' },
    movers: [
      { symbol: 'NVDA', price: 878.35, change: 3.2, reason: 'AI demand surge' },
      { symbol: 'AAPL', price: 182.52, change: -1.1, reason: 'iPhone sales concern' },
      { symbol: 'TSLA', price: 175.20, change: 2.8, reason: 'Delivery beat' },
    ],
    news: [
      { title: 'Markets rally on Fed rate expectations', summary: 'Mock data - set ALPHA_VANTAGE_KEY for live data', url: '#' },
    ],
  };
}

interface AVQuote {
  '05. price': string;
  '10. change percent': string;
}

async function fetchQuote(symbol: string, apiKey: string): Promise<{ price: string; change: string } | null> {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return null;

    const json = await res.json();
    const q: AVQuote | undefined = json['Global Quote'];
    if (!q || !q['05. price']) return null;

    const price = parseFloat(q['05. price']).toLocaleString('en-US', { minimumFractionDigits: 2 });
    const change = q['10. change percent'] || '0%';
    return { price, change };
  } catch {
    return null;
  }
}

async function fetchTopMovers(apiKey: string): Promise<StockData['movers']> {
  try {
    const url = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return [];

    const json = await res.json();
    const gainers = (json.top_gainers || []).slice(0, 3) as {
      ticker: string; price: string; change_percentage: string;
    }[];
    const losers = (json.top_losers || []).slice(0, 2) as {
      ticker: string; price: string; change_percentage: string;
    }[];

    const map = (items: typeof gainers) =>
      items.map((item) => ({
        symbol: item.ticker,
        price: parseFloat(item.price) || 0,
        change: parseFloat(item.change_percentage) || 0,
      }));

    return [...map(gainers), ...map(losers)];
  } catch {
    return [];
  }
}

async function fetchStockNews(): Promise<StockData['news']> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query: 'stock market news today S&P 500 Nasdaq', max_results: 5, search_depth: 'basic' }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return [];

    const data = await res.json();
    return ((data.results || []) as { title: string; content: string; url: string }[]).map((r) => ({
      title: r.title, summary: r.content?.slice(0, 200) || '', url: r.url,
    }));
  } catch {
    return [];
  }
}

export async function fetchStockData(): Promise<StockData> {
  const apiKey = process.env.ALPHA_VANTAGE_KEY;
  if (!apiKey) return mockData();

  try {
    const [spy, qqq, movers, news] = await Promise.all([
      fetchQuote('SPY', apiKey),
      fetchQuote('QQQ', apiKey),
      fetchTopMovers(apiKey),
      fetchStockNews(),
    ]);

    return {
      sp500: spy || { price: 'N/A', change: 'N/A' },
      nasdaq: qqq || { price: 'N/A', change: 'N/A' },
      movers,
      news,
    };
  } catch {
    return mockData();
  }
}
