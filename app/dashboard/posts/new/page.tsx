"use client";

import { useState } from "react";
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

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [account, setAccount] = useState("");
  const [when, setWhen] = useState("");

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
          <Input
            placeholder="Account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          />
          <Input
            type="datetime-local"
            placeholder="When (optional)"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="sm:col-span-2"
          />
          <div className="sm:col-span-2">
            <textarea
              placeholder="Caption / Content"
              className="w-full rounded-md border border-white/10 bg-transparent p-3 text-sm outline-none focus:ring-1 focus:ring-white/30 min-h-40"
            />
          </div>
          <div className="sm:col-span-2">
            <div className="h-40 rounded-md border border-dashed border-white/15 flex items-center justify-center text-sm text-white/70">
              Media uploader placeholder
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/posts">Cancel</Link>
          </Button>
          <Button variant="secondary">Save Draft</Button>
          <Button>Queue Post</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
