"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/accounts", label: "Accounts" },
  { href: "/dashboard/posts", label: "Posts" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 xl:w-80 shrink-0 border-r bg-black">
      <div className="w-full p-4">
        <div className="px-3 py-2">
          <div className="text-lg font-semibold tracking-tight text-white">
            dashboard
          </div>
          <p className="text-sm text-white">Manage accounts and schedules</p>
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
                    ? "bg-white text-black"
                    : "text-white/80 hover:bg-zinc-900 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isActive ? "bg-black" : "bg-white/70"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
