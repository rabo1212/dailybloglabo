import Link from "next/link";
import TabNav from "./TabNav";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-bg/95 backdrop-blur-sm border-b border-card-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-text-primary font-bold text-lg tracking-tight">
            DAYLOG_EV
          </Link>
          <nav className="flex items-center gap-4 text-sm text-text-dim">
            <Link href="/search" className="hover:text-text-body transition-colors">
              Search
            </Link>
            <Link href="/archive" className="hover:text-text-body transition-colors">
              Archive
            </Link>
            <Link href="/rss.xml" className="hover:text-text-body transition-colors">
              RSS
            </Link>
            <ThemeToggle />
          </nav>
        </div>
        <TabNav />
      </div>
    </header>
  );
}
