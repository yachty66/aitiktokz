"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/accounts", label: "Accounts" },
  { href: "/dashboard/schedules", label: "Schedules" },
];

export function Sidebar(): JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 xl:w-80 shrink-0 border-r bg-card/40 backdrop-blur-sm">
      <div className="w-full p-4">
        <div className="px-3 py-2">
          <div className="text-lg font-semibold tracking-tight">dashboard</div>
          <p className="text-sm text-muted-foreground">
            Manage accounts and schedules
          </p>
        </div>

        <nav className="mt-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span className="h-2 w-2 rounded-full bg-foreground/70" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
