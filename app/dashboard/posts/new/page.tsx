"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [account, setAccount] = useState("");
  const [when, setWhen] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<
    { id: string | number; name?: string | null; account?: string | null }[]
  >([]);
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

  const handleQueue = async () => {
    try {
      setSaving(true);
      const supabase = createSupabaseBrowserClient();
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) throw new Error("Not signed in");
      if (!videoFile) throw new Error("Please select a video");
      if (!account) throw new Error("Please select an account");
      if (!when) throw new Error("Please select a start date");

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
      alert(e.message || "Failed to create post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Post</h1>
          <p className="text-sm text-white/80">
            Fill in the details and save or queue.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/posts">Back to Posts</Link>
        </Button>
      </header>

      <Card className="bg-black border-white/10 text-white">
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
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
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2 grid gap-3">
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
              className="w-full rounded-md border border-white/10 bg-transparent p-3 text-sm outline-none focus:ring-1 focus:ring-white/30 min-h-28"
            />
            <Input
              placeholder="Hashtags (comma or space separated)"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/posts">Cancel</Link>
          </Button>
          <Button variant="secondary" disabled={saving} onClick={handleQueue}>
            {saving ? "Uploading…" : "Queue Post"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
