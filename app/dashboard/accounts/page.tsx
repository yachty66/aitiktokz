"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MockAccount = {
  id: string;
  platform: string;
  handle: string;
  status: "connected" | "disconnected";
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<MockAccount[]>([]);

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

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Create Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Platform (e.g., TikTok)" />
          <Input placeholder="Handle" />
          <Button className="sm:col-span-1">Add</Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="h-40 rounded-md border border-dashed border-white/15 flex items-center justify-center text-sm text-muted-foreground">
              No accounts yet. Add one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4">Platform</th>
                    <th className="py-2 pr-4">Handle</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-b border-white/10">
                      <td className="py-2 pr-4">{a.platform}</td>
                      <td className="py-2 pr-4">{a.handle}</td>
                      <td className="py-2 pr-4 capitalize">{a.status}</td>
                      <td className="py-2 pr-0 text-right">
                        <Button size="sm" variant="outline" className="mr-2">
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive">
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
