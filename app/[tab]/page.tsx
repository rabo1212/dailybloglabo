import { notFound } from "next/navigation";
import { getPostsByTab } from "@/lib/utils";
import { TAB_CONFIG, Tab } from "@/lib/types";
import PostCard from "@/components/PostCard";

const VALID_TABS: Tab[] = ["health", "finance", "tech", "devlog", "trending"];

interface TabPageProps {
  params: { tab: string };
}

export function generateStaticParams() {
  return VALID_TABS.map((tab) => ({ tab }));
}

export function generateMetadata({ params }: TabPageProps) {
  const tab = params.tab as Tab;
  if (!VALID_TABS.includes(tab)) return {};
  const config = TAB_CONFIG[tab];
  return {
    title: `${config.label} - 데일리블로그라보`,
  };
}

export default function TabPage({ params }: TabPageProps) {
  const tab = params.tab as Tab;

  if (!VALID_TABS.includes(tab)) {
    notFound();
  }

  const config = TAB_CONFIG[tab];
  const posts = getPostsByTab(tab);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: config.color }}>
          {config.label}
        </h1>
        <p className="text-sm text-text-dim mt-1">
          {posts.length}개 포스트
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-dim text-lg">아직 게시글이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => (
            <PostCard key={`${post.tab}-${post.slug}`} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
