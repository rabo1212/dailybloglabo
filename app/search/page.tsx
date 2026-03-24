'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TAB_CONFIG, Tab, Post } from '@/lib/types';

// Search is client-side: fetches all posts at build, filters on client
export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Post[]>([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearched(true);

    // Fetch posts from API route
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data.posts || []);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Search</h1>

      <input
        type="text"
        placeholder="제목이나 내용으로 검색..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full px-4 py-3 bg-card border border-card-border rounded-lg text-text-body placeholder:text-text-dim focus:outline-none focus:border-text-dim/50 transition-colors"
        autoFocus
      />

      {searched && (
        <p className="text-sm text-text-dim mt-4 mb-6">
          {results.length}개 결과
        </p>
      )}

      <div className="mt-4 space-y-3">
        {results.map((post) => {
          const config = TAB_CONFIG[post.tab as Tab];
          return (
            <Link
              key={`${post.tab}-${post.slug}`}
              href={`/${post.tab}/${post.slug}`}
              className="block p-4 bg-card border border-card-border rounded-lg hover:border-text-dim/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{ color: config?.color, backgroundColor: `${config?.color}15` }}
                >
                  {config?.label}
                </span>
                <span className="text-xs text-text-dim">{post.date}</span>
              </div>
              <h3 className="text-text-primary font-medium">{post.title}</h3>
              <p className="text-sm text-text-dim mt-1 line-clamp-1">{post.summary}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
