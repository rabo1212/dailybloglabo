import { getAllPosts } from "@/lib/utils";
import PostGrid from "@/components/PostGrid";

export default function HomePage() {
  const posts = getAllPosts();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Latest Posts
        </h1>
        <p className="text-sm text-text-dim mt-1">
          All channels, sorted by date
        </p>
      </div>

      <PostGrid posts={posts} />
    </div>
  );
}
