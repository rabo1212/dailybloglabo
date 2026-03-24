"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_CONFIG, Tab } from "@/lib/types";

const tabs = Object.keys(TAB_CONFIG) as Tab[];

export default function TabNav() {
  const pathname = usePathname();

  function isActive(tab: Tab): boolean {
    return pathname === `/${tab}` || pathname.startsWith(`/${tab}/`);
  }

  return (
    <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const config = TAB_CONFIG[tab];
        const active = isActive(tab);

        return (
          <Link
            key={tab}
            href={`/${tab}`}
            className={`
              relative px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors
              ${active ? config.colorClass : "text-text-dim hover:text-text-body"}
            `}
          >
            {config.label}
            {active && (
              <span
                className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                style={{ backgroundColor: config.color }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
