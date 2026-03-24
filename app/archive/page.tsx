import Link from 'next/link';
import { getAllPosts } from '@/lib/utils';
import { TAB_CONFIG } from '@/lib/types';
import EditionBadge from '@/components/EditionBadge';

export const metadata = {
  title: 'Archive - DAYLOG_EV',
};

export default function ArchivePage() {
  const posts = getAllPosts();

  // Group by date
  const byDate = new Map<string, typeof posts>();
  for (const post of posts) {
    const existing = byDate.get(post.date) || [];
    existing.push(post);
    byDate.set(post.date, existing);
  }

  const dates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-8">Archive</h1>

      {dates.length === 0 ? (
        <p className="text-text-dim">아직 게시글이 없습니다</p>
      ) : (
        <div className="space-y-8">
          {dates.map((date) => {
            const datePosts = byDate.get(date)!;
            const d = new Date(date + 'T00:00:00');
            const label = d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

            return (
              <div key={date}>
                <h2 className="text-sm font-medium text-text-dim mb-3">{label}</h2>
                <div className="space-y-2">
                  {datePosts.map((post) => {
                    const config = TAB_CONFIG[post.tab];
                    return (
                      <Link
                        key={`${post.tab}-${post.slug}`}
                        href={`/${post.tab}/${post.slug}`}
                        className="flex items-center gap-3 py-2 px-3 -mx-3 rounded-lg hover:bg-card transition-colors"
                      >
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded shrink-0"
                          style={{ color: config.color, backgroundColor: `${config.color}15` }}
                        >
                          {config.label}
                        </span>
                        <EditionBadge edition={post.edition} />
                        <span className="text-text-body text-sm truncate">{post.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
