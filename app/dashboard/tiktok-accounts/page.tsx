"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type CreatorInfo = {
  creator_username?: string;
  creator_nickname?: string;
  creator_avatar_url?: string;
};

export default function TikTokAccountsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [info, setInfo] = useState<CreatorInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/tiktok/me", { cache: "no-store" });
      if (res.status === 401) {
        setConnected(false);
        setInfo(null);
        return;
      }
      const json = await res.json();
      setConnected(!!json?.connected);
      setInfo(json?.data || null);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const handleConnect = () => {
    router.push("/api/tiktok/authorize");
  };

  const handleDisconnect = async () => {
    await fetch("/api/tiktok/disconnect", { method: "POST" });
    await refresh();
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <Card className="bg-black border border-white/10 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">TikTok Accounts</h1>
            <p className="text-sm text-white/60 mt-2">
              Connect your TikTok account to post directly from the app.
            </p>
          </div>
          {connected ? (
            <Button
              className="bg-white/10 hover:bg-white/20"
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              className="bg-white text-black hover:bg-gray-200"
              onClick={handleConnect}
            >
              Connect TikTok
            </Button>
          )}
        </div>

        <div className="mt-6 border-t border-white/10 pt-6">
          {loading ? (
            <p className="text-white/60">Checking connection…</p>
          ) : connected ? (
            <div className="flex items-center gap-4">
              {info?.creator_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={info.creator_avatar_url}
                  alt="avatar"
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/10" />
              )}
              <div>
                <div className="text-lg font-semibold">
                  {info?.creator_nickname ||
                    info?.creator_username ||
                    "Connected"}
                </div>
                {info?.creator_username && (
                  <div className="text-white/60">@{info.creator_username}</div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-white/60">No TikTok account connected.</p>
          )}

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      </Card>
    </div>
  );
}
