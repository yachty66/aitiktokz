"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/slideshows", label: "Slideshows" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 xl:w-80 shrink-0 border-r bg-black">
      <div className="w-full p-4">
        <div className="px-3 py-2">
          <div className="text-lg font-semibold tracking-tight text-white">
            dashboard
          </div>
          <p className="text-sm text-white">Create and manage slideshows</p>
        </div>

        <nav className="mt-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
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
        {/* User */}
        <div className="mt-6 border-t border-white/10 pt-4">
          {user ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {/* avatar */}
                {(() => {
                  const anyUser = user as any;
                  const avatarUrl =
                    anyUser?.user_metadata?.avatar_url ||
                    anyUser?.user_metadata?.picture ||
                    anyUser?.identities?.[0]?.identity_data?.avatar_url ||
                    anyUser?.identities?.[0]?.identity_data?.picture;
                  return (
                    <img
                      src={
                        avatarUrl || "https://www.gravatar.com/avatar/?d=mp&f=y"
                      }
                      alt="avatar"
                      className="h-8 w-8 rounded-full bg-white object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          "https://www.gravatar.com/avatar/?d=mp&f=y";
                      }}
                    />
                  );
                })()}
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {(user?.user_metadata?.name as string | undefined) ||
                      (user?.user_metadata?.full_name as string | undefined) ||
                      user?.email}
                  </div>
                  <div className="text-xs text-white/70 truncate">
                    {user?.email}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          ) : (
            <Link href="/" className="text-sm text-white/80 hover:text-white">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
