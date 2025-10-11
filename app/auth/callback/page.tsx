"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    // Get the session (hash params are processed internally by supabase-js)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      } else {
        router.replace("/");
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      Completing sign-in…
    </div>
  );
}