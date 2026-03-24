'use client';

import { useEffect, useState } from 'react';
import { Lang } from '@/lib/types';

export default function LangToggle() {
  const [lang, setLang] = useState<Lang>('ko');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null;
    if (saved && (saved === 'en' || saved === 'ko')) {
      setLang(saved);
    }
  }, []);

  function switchLang(newLang: Lang) {
    setLang(newLang);
    localStorage.setItem('lang', newLang);
    window.dispatchEvent(new CustomEvent('langchange', { detail: newLang }));
  }

  return (
    <div className="flex items-center gap-0.5 text-xs font-medium">
      <button
        onClick={() => switchLang('en')}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          lang === 'en'
            ? 'text-text-primary bg-card-border/50'
            : 'text-text-dim hover:text-text-body'
        }`}
      >
        EN
      </button>
      <span className="text-text-dim/40">|</span>
      <button
        onClick={() => switchLang('ko')}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          lang === 'ko'
            ? 'text-text-primary bg-card-border/50'
            : 'text-text-dim hover:text-text-body'
        }`}
      >
        KO
      </button>
    </div>
  );
}
