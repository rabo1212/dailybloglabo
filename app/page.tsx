import { getAllPosts } from "@/lib/utils";
import PostCard from "@/components/PostCard";

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

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-dim text-lg">No posts yet</p>
          <p className="text-text-dim/60 text-sm mt-2">
            Posts will appear here once the automated pipeline runs.
          </p>
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
