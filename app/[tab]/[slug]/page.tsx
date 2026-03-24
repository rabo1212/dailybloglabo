import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getPost, getPostsByTab, formatDate } from "@/lib/utils";
import { TAB_CONFIG, Tab } from "@/lib/types";
import EditionBadge from "@/components/EditionBadge";

const VALID_TABS: Tab[] = ["devlog", "ai", "crypto", "stocks", "hot"];

interface PostPageProps {
  params: { tab: string; slug: string };
}

export function generateMetadata({ params }: PostPageProps) {
  const tab = params.tab as Tab;
  if (!VALID_TABS.includes(tab)) return {};
  const post = getPost(tab, params.slug);
  if (!post) return {};
  return {
    title: `${post.title} - DailyBlogLabo`,
    description: post.summary,
  };
}

export default function PostPage({ params }: PostPageProps) {
  const tab = params.tab as Tab;

  if (!VALID_TABS.includes(tab)) {
    notFound();
  }

  const post = getPost(tab, params.slug);

  if (!post) {
    notFound();
  }

  const tabConfig = TAB_CONFIG[post.tab];

  // Get sibling posts for prev/next navigation
  const tabPosts = getPostsByTab(tab);
  const currentIndex = tabPosts.findIndex((p) => p.slug === post.slug);
  const prevPost = currentIndex < tabPosts.length - 1 ? tabPosts[currentIndex + 1] : null;
  const nextPost = currentIndex > 0 ? tabPosts[currentIndex - 1] : null;

  return (
    <article className="max-w-3xl mx-auto">
      {/* Cover image */}
      {post.image && (
        <div className="relative aspect-[2/1] rounded-lg overflow-hidden mb-8">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      )}

      {/* Meta badges */}
      <div className="flex items-center gap-2 mb-4">
        <Link
          href={`/${post.tab}`}
          className="text-xs font-medium px-2 py-0.5 rounded transition-opacity hover:opacity-80"
          style={{
            color: tabConfig.color,
            backgroundColor: `${tabConfig.color}15`,
          }}
        >
          {tabConfig.label}
        </Link>
        <EditionBadge edition={post.edition} />
        <span className="text-xs text-text-dim">
          {formatDate(post.date)}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight leading-tight mb-8">
        {post.title}
      </h1>

      {/* Content */}
      <div
        className="prose prose-invert max-w-none
          [&>p]:mb-5 [&>p]:leading-relaxed
          [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:text-text-primary [&>h2]:mt-10 [&>h2]:mb-4
          [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:text-text-primary [&>h3]:mt-8 [&>h3]:mb-3
          [&>ul]:mb-5 [&>ul]:list-disc [&>ul]:pl-5
          [&>ol]:mb-5 [&>ol]:list-decimal [&>ol]:pl-5
          [&>li]:mb-1.5
          [&>blockquote]:border-l-2 [&>blockquote]:border-text-dim/30 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-text-dim
          [&>hr]:border-card-border [&>hr]:my-8
          [&>pre]:bg-card [&>pre]:border [&>pre]:border-card-border [&>pre]:rounded-lg [&>pre]:p-4 [&>pre]:overflow-x-auto [&>pre]:font-mono [&>pre]:text-sm
          [&>table]:w-full [&>table]:border-collapse
          [&_th]:text-left [&_th]:text-text-primary [&_th]:border-b [&_th]:border-card-border [&_th]:pb-2 [&_th]:pr-4
          [&_td]:border-b [&_td]:border-card-border/50 [&_td]:py-2 [&_td]:pr-4
        "
        dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
      />

      {/* Prev/Next navigation */}
      <nav className="mt-16 pt-8 border-t border-card-border grid grid-cols-2 gap-4">
        <div>
          {prevPost && (
            <Link
              href={`/${tab}/${prevPost.slug}`}
              className="group block"
            >
              <span className="text-xs text-text-dim">Previous</span>
              <p className="text-sm text-text-body group-hover:text-text-primary transition-colors line-clamp-1 mt-0.5">
                {prevPost.title}
              </p>
            </Link>
          )}
        </div>
        <div className="text-right">
          {nextPost && (
            <Link
              href={`/${tab}/${nextPost.slug}`}
              className="group block"
            >
              <span className="text-xs text-text-dim">Next</span>
              <p className="text-sm text-text-body group-hover:text-text-primary transition-colors line-clamp-1 mt-0.5">
                {nextPost.title}
              </p>
            </Link>
          )}
        </div>
      </nav>
    </article>
  );
}

/**
 * Minimal markdown-to-HTML converter for post content.
 * Handles common patterns: headings, paragraphs, bold, italic, links, code, lists, blockquotes, hr, images.
 */
function markdownToHtml(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList: "ul" | "ol" | null = null;
  let inCodeBlock = false;
  let codeContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks
    if (line.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        html.push(`<pre><code>${codeContent.join("\n")}</code></pre>`);
        codeContent = [];
        inCodeBlock = false;
      } else {
        if (inList) { html.push(`</${inList}>`); inList = null; }
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeContent.push(escapeHtml(line));
      continue;
    }

    // Close list if line doesn't continue it
    if (inList === "ul" && !line.match(/^\s*[-*]\s/)) {
      html.push("</ul>");
      inList = null;
    }
    if (inList === "ol" && !line.match(/^\s*\d+\.\s/)) {
      html.push("</ol>");
      inList = null;
    }

    // Blank line
    if (line.trim() === "") continue;

    // Horizontal rule
    if (line.match(/^---+$/)) {
      html.push("<hr>");
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inline(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      html.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`);
      continue;
    }

    // Unordered list
    const ulMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inList !== "ul") { html.push("<ul>"); inList = "ul"; }
      html.push(`<li>${inline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList !== "ol") { html.push("<ol>"); inList = "ol"; }
      html.push(`<li>${inline(olMatch[1])}</li>`);
      continue;
    }

    // Image
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      html.push(`<img src="${imgMatch[2]}" alt="${escapeHtml(imgMatch[1])}" class="rounded-lg my-4" />`);
      continue;
    }

    // Paragraph
    html.push(`<p>${inline(line)}</p>`);
  }

  if (inList) html.push(`</${inList}>`);
  if (inCodeBlock) html.push(`<pre><code>${codeContent.join("\n")}</code></pre>`);

  return html.join("\n");
}

/** Process inline markdown: bold, italic, code, links, images */
function inline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="inline" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
