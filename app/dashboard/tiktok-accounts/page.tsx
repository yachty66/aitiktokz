"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TikTokAccountsPage() {
  const handleConnect = async () => {
    // TODO: Wire to your TikTok OAuth flow
    // For now just log; replace with router.push to your auth URL
    console.log("Connect TikTok clicked");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="space-y-6">
        <Card className="bg-black border border-white/10 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Connected Accounts</h1>
              <p className="text-sm text-white/60 mt-2">
                To add multiple TikTok accounts: Go to tiktok.com and sign out,
                then come back here and click "Connect TikTok"
              </p>
            </div>
            <Button
              className="bg-white text-black hover:bg-gray-200"
              onClick={handleConnect}
            >
              <span className="mr-2 text-lg leading-none">+</span>
              Connect TikTok
            </Button>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <div className="flex items-center gap-3 text-white">
              {/* TikTok glyph */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="text-white"
                aria-hidden
              >
                <path d="M16.5 3.5v.2c0 2.2 1.8 4 4 4h.2v3.2c-1.6-.1-3.1-.6-4.4-1.5-.8-.6-1.5-1.3-2-2.1v7.8c0 3.3-2.7 6-6 6S2.3 18.4 2.3 15s2.7-6 6-6c.5 0 1 .1 1.4.2v3.6c-.4-.2-.9-.3-1.4-.3-1.7 0-3.1 1.4-3.1 3.1S5.6 18 7.3 18s3.1-1.4 3.1-3.1V3.5h6.1z" />
              </svg>
              <span className="text-lg font-medium">TikTok</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
