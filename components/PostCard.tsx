import Link from "next/link";
import Image from "next/image";
import { Post, TAB_CONFIG } from "@/lib/types";
import EditionBadge from "./EditionBadge";

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const tabConfig = TAB_CONFIG[post.tab];

  return (
    <Link href={`/${post.tab}/${post.slug}`} className="group block">
      <article className="h-full bg-card border border-card-border rounded-lg overflow-hidden transition-colors hover:border-text-dim/30">
        {post.image ? (
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        ) : (
          <div
            className="aspect-[16/9] flex items-center justify-center"
            style={{ backgroundColor: `${tabConfig.color}08` }}
          >
            <span
              className="text-3xl font-bold opacity-20"
              style={{ color: tabConfig.color }}
            >
              {tabConfig.label}
            </span>
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{
                color: tabConfig.color,
                backgroundColor: `${tabConfig.color}15`,
              }}
            >
              {tabConfig.label}
            </span>
            <EditionBadge edition={post.edition} />
            <span className="text-xs text-text-dim ml-auto">
              {new Date(post.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <h3 className="text-text-primary font-semibold leading-snug mb-2 line-clamp-2 group-hover:underline decoration-1 underline-offset-2">
            {post.title}
          </h3>

          <p className="text-sm text-text-dim line-clamp-2">
            {post.summary}
          </p>
        </div>
      </article>
    </Link>
  );
}
