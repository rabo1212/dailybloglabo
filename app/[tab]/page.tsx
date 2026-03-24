import { notFound } from "next/navigation";
import { getPostsByTab } from "@/lib/utils";
import { TAB_CONFIG, Tab } from "@/lib/types";
import PostGrid from "@/components/PostGrid";

const VALID_TABS: Tab[] = ["devlog", "ai", "crypto", "stocks", "hot"];

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
    title: `${config.label} - DailyBlogLabo`,
    description: `Latest ${config.label} posts`,
  };
}

export default function TabPage({ params }: TabPageProps) {
  const tab = params.tab as Tab;

  if (!VALID_TABS.includes(tab)) {
    notFound();
  }

  const config = TAB_CONFIG[tab];
  // Pass all posts for this tab (both languages) - PostGrid handles filtering
  const posts = getPostsByTab(tab);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: config.color }}>
          {config.label}
        </h1>
        <p className="text-sm text-text-dim mt-1">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      </div>

      <PostGrid posts={posts} />
    </div>
  );
}
