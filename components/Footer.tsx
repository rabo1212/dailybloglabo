import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-card-border mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-dim">
          <p>DAYLOG_EV -- Automated with Claude AI</p>
          <div className="flex items-center gap-4">
            <Link href="/feed.xml" className="hover:text-text-body transition-colors">
              RSS Feed
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
