"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type AccountRow = {
  id?: number | string;
  name?: string | null;
  account?: string | null;
  status?: string | null;
  followers?: number | null;
  user_uid?: string | null;
  user_email?: string | null;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const load = async () => {
      setLoading(true);
      setError(null);
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      let query = supabase.from("accounts").select("*");
      if (user.id) {
        query = query.eq("user_uid", user.id);
      }
      const { data, error } = await query;
      if (error) {
        const { data: dataByEmail } = await supabase
          .from("accounts")
          .select("*")
          .eq("user_email", user.email ?? "");
        if (dataByEmail) setAccounts(dataByEmail as AccountRow[]);
        else setError(error.message);
      } else {
        setAccounts((data as AccountRow[]) ?? []);
      }
      setLoading(false);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Connect and manage posting profiles.
          </p>
        </div>
        <Button
          onClick={() => {
            /* wire later */
          }}
        >
          Connect Account
        </Button>
      </header>

      <Card className="bg-black border-white/10 text-white">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Platform (e.g., TikTok)" />
          <Input placeholder="Handle" />
          <Button className="sm:col-span-1">Add</Button>
        </CardContent>
      </Card>

      <Card className="bg-black border-white/10 text-white">
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-40 rounded-md border border-dashed border-white/15 flex items-center justify-center text-sm text-white/70">
              Loading accounts…
            </div>
          ) : accounts.length === 0 ? (
            <div className="h-40 rounded-md border border-dashed border-white/15 flex items-center justify-center text-sm text-white/70">
              No accounts yet. Add one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-white/80">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Account</th>
                    <th className="py-2 pr-4">Followers</th>
                    <th className="py-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a, idx) => (
                    <tr
                      key={(a.id as any) ?? idx}
                      className="border-b border-white/10"
                    >
                      <td className="py-2 pr-4">{a.name ?? "—"}</td>
                      <td className="py-2 pr-4">{a.account ?? "—"}</td>
                      <td className="py-2 pr-4">{a.followers ?? "—"}</td>
                      <td className="py-2 pr-4 capitalize">
                        {a.status ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {error ? (
            <div className="mt-3 text-xs text-red-400">{error}</div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
