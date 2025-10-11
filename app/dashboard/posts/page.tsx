"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type MockPost = {
  id: string;
  title: string;
  account: string;
  status: "draft" | "queued" | "posted";
};

export default function PostsPage() {
  const [posts, setPosts] = useState<MockPost[]>([]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          <p className="text-sm text-white/80">Create and manage your posts.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/posts/new">New Post</Link>
        </Button>
      </header>

      <Card className="bg-black border-white/10 text-white">
        <CardHeader>
          <CardTitle>Create Post</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input placeholder="Title" />
          <Input placeholder="Account" />
          <Input placeholder="When (optional)" />
          <Button>Create</Button>
        </CardContent>
      </Card>

      <Card className="bg-black border-white/10 text-white">
        <CardHeader>
          <CardTitle>All Posts</CardTitle>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="h-40 rounded-md border border-dashed border-white/15 flex items-center justify-center text-sm text-white/70">
              No posts yet. Create one above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-white/80">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Account</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((p) => (
                    <tr key={p.id} className="border-b border-white/10">
                      <td className="py-2 pr-4">{p.title}</td>
                      <td className="py-2 pr-4">{p.account}</td>
                      <td className="py-2 pr-4 capitalize">{p.status}</td>
                      <td className="py-2 pr-0 text-right">
                        <Button size="sm" variant="outline" className="mr-2">
                          Edit
                        </Button>
                        <Button size="sm" variant="destructive">
                          Delete
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
