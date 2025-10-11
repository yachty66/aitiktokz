"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type MockPost = {
  id: string;
  title: string;
  account: string;
  status: "draft" | "queued" | "posted";
};

export default function PostsPage() {
  const [posts, setPosts] = useState<MockPost[]>([]);
  const [title, setTitle] = useState("");
  const [account, setAccount] = useState("");
  const [when, setWhen] = useState("");
  const [accounts, setAccounts] = useState<
    { id: string | number; name?: string | null; account?: string | null }[]
  >([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState("");
  const [hashtags, setHashtags] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      const { data: rows } = await supabase
        .from("accounts")
        .select("id,name,account,user_uid,user_email")
        .or(`user_uid.eq.${user.id},user_email.eq.${user.email}`);
      setAccounts((rows as any) ?? []);
    });
  }, []);

  const uploadToS3 = async (file: File): Promise<string> => {
    const res = await fetch("/api/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "video/mp4",
      }),
    });
    if (!res.ok) throw new Error("Failed to get upload URL");
    const { url, fields, publicUrl } = await res.json();
    const formData = new FormData();
    Object.entries(fields).forEach(([k, v]) => formData.append(k, v as string));
    formData.append("Content-Type", file.type || "video/mp4");
    formData.append("file", file);
    const upload = await fetch(url, { method: "POST", body: formData });
    if (!upload.ok) throw new Error("S3 upload failed");
    return publicUrl as string;
  };

  const handleQuickCreate = async () => {
    try {
      setSaving(true);
      const supabase = createSupabaseBrowserClient();
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("Not signed in");
      if (!videoFile) throw new Error("Select a video");
      if (!account) throw new Error("Select an account");
      const videoUrl = await uploadToS3(videoFile);
      await supabase.from("posts").insert({
        title,
        account,
        start_at: when,
        video_url: videoUrl,
        description,
        hashtags,
        user_uid: user.id,
        user_email: user.email,
        status: "queued",
      });
      setTitle("");
      setAccount("");
      setWhen("");
      setVideoFile(null);
      setDescription("");
      setHashtags("");
      alert("Post queued");
    } catch (e: any) {
      alert(e.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Posts</h1>
          <p className="text-sm text-white/80">Create and manage your posts.</p>
        </div>
        <div />
      </header>

      <Card className="bg-black border-white/10 text-white">
        <CardHeader>
          <CardTitle>Quick Create</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <select
            className="rounded-md bg-transparent border border-white/10 px-3 py-2 text-sm"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            <option value="" className="bg-black">
              Select account
            </option>
            {accounts.map((a) => (
              <option
                key={a.id}
                value={a.account ?? String(a.id)}
                className="bg-black"
              >
                {a.name || a.account || a.id}
              </option>
            ))}
          </select>
          <Input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            className="text-sm"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="sm:col-span-4 w-full rounded-md border border-white/10 bg-transparent p-3 text-sm outline-none focus:ring-1 focus:ring-white/30 min-h-24"
          />
          <Input
            placeholder="Hashtags (comma or space separated)"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className="sm:col-span-4"
          />
          <div className="sm:col-span-4 flex gap-2 justify-end">
            <Button onClick={handleQuickCreate} disabled={saving}>
              {saving ? "Uploading…" : "Save draft"}
            </Button>
          </div>
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
