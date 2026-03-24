'use client';

import { useEffect, useState } from 'react';
import { Post, Lang } from '@/lib/types';
import PostCard from './PostCard';

interface PostGridProps {
  posts: Post[];
}

export default function PostGrid({ posts }: PostGridProps) {
  const [lang, setLang] = useState<Lang>('ko');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null;
    if (saved && (saved === 'en' || saved === 'ko')) {
      setLang(saved);
    }

    function handleLangChange(e: Event) {
      const newLang = (e as CustomEvent).detail as Lang;
      setLang(newLang);
    }

    window.addEventListener('langchange', handleLangChange);
    return () => window.removeEventListener('langchange', handleLangChange);
  }, []);

  const filtered = posts.filter(p => (p.lang || 'en') === lang);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-text-dim text-lg">
          {lang === 'ko' ? '아직 게시글이 없습니다' : 'No posts yet'}
        </p>
        <p className="text-text-dim/60 text-sm mt-2">
          {lang === 'ko'
            ? '자동 파이프라인이 실행되면 게시글이 여기에 나타납니다.'
            : 'Posts will appear here once the automated pipeline runs.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {filtered.map((post) => (
        <PostCard key={`${post.tab}-${post.slug}`} post={post} />
      ))}
    </div>
  );
}
