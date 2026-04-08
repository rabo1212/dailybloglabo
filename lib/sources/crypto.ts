interface CryptoData {
  btc: { price: number; change24h: number };
  eth: { price: number; change24h: number };
  totalMarketCap: string;
  totalVolume: string;
  fearGreed: number;
  topMovers: { name: string; symbol: string; price: number; change: number }[];
  news: { title: string; summary: string; url: string }[];
}

const TIMEOUT = 2000;

function mockData(): CryptoData {
  return {
    btc: { price: 0, change24h: 0 },
    eth: { price: 0, change24h: 0 },
    totalMarketCap: 'N/A',
    totalVolume: 'N/A',
    fearGreed: 50,
    topMovers: [],
    news: [],
  };
}

async function fetchMarkets(): Promise<{ btc: CryptoData['btc']; eth: CryptoData['eth']; topMovers: CryptoData['topMovers'] }> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20',
      { signal: AbortSignal.timeout(TIMEOUT) },
    );
    if (!res.ok) return { btc: { price: 0, change24h: 0 }, eth: { price: 0, change24h: 0 }, topMovers: [] };

    const coins = (await res.json()) as {
      id: string; name: string; symbol: string;
      current_price: number; price_change_percentage_24h: number;
    }[];

    const btcCoin = coins.find((c) => c.id === 'bitcoin');
    const ethCoin = coins.find((c) => c.id === 'ethereum');

    const sorted = [...coins].sort(
      (a, b) => Math.abs(b.price_change_percentage_24h || 0) - Math.abs(a.price_change_percentage_24h || 0),
    );

    return {
      btc: { price: btcCoin?.current_price || 0, change24h: btcCoin?.price_change_percentage_24h || 0 },
      eth: { price: ethCoin?.current_price || 0, change24h: ethCoin?.price_change_percentage_24h || 0 },
      topMovers: sorted.slice(0, 5).map((c) => ({
        name: c.name, symbol: c.symbol.toUpperCase(),
        price: c.current_price, change: c.price_change_percentage_24h || 0,
      })),
    };
  } catch {
    return { btc: { price: 0, change24h: 0 }, eth: { price: 0, change24h: 0 }, topMovers: [] };
  }
}

async function fetchGlobal(): Promise<{ totalMarketCap: string; totalVolume: string }> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global', {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return { totalMarketCap: 'N/A', totalVolume: 'N/A' };

    const json = await res.json();
    const data = json.data || {};
    const cap = data.total_market_cap?.usd;
    const vol = data.total_volume?.usd;

    const fmt = (n: number) => {
      if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
      if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      return `$${n.toLocaleString()}`;
    };

    return { totalMarketCap: cap ? fmt(cap) : 'N/A', totalVolume: vol ? fmt(vol) : 'N/A' };
  } catch {
    return { totalMarketCap: 'N/A', totalVolume: 'N/A' };
  }
}

async function fetchFearGreed(): Promise<number> {
  try {
    const res = await fetch('https://api.alternative.me/fng/', {
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return 50;
    const json = await res.json();
    return parseInt(json.data?.[0]?.value || '50', 10);
  } catch {
    return 50;
  }
}

async function fetchCryptoNews(): Promise<CryptoData['news']> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query: 'cryptocurrency market news today', max_results: 5, search_depth: 'basic' }),
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

export async function fetchCryptoData(): Promise<CryptoData> {
  try {
    const [markets, global, fearGreed, news] = await Promise.all([
      fetchMarkets(), fetchGlobal(), fetchFearGreed(), fetchCryptoNews(),
    ]);

    return {
      btc: markets.btc, eth: markets.eth,
      totalMarketCap: global.totalMarketCap, totalVolume: global.totalVolume,
      fearGreed, topMovers: markets.topMovers, news,
    };
  } catch {
    return mockData();
  }
}
