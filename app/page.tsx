"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(false);
    fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to join waitlist");
        }
        setIsSubmitted(true);
      })
      .catch((err) => {
        console.error(err);
        alert("Something went wrong. Please try again.");
      });
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-4xl mx-auto text-center space-y-8">
        {/* Header Section */}
        <div className="space-y-4">
          <h1 className="text-6xl md:text-7xl font-bold text-white leading-tight text-balance">
            AI TikTok that Drive Sales
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto text-pretty">
            We provide the warmed TikTok account and handle posting end-to-end.
            You just share your business link.
          </p>
        </div>

        {/* Main Content Card */}
        <Card className="max-w-md mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 shadow-xl">
          {!isSubmitted ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">
                  Join the Waitlist
                </h2>
                <p className="text-gray-300">
                  Get exclusive early access to aitiktokz.com
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-white/20"
                />
                <Button
                  type="submit"
                  className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3"
                >
                  Join Waitlist
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">
                You're on the list!
              </h3>
              <p className="text-gray-300">
                Thanks - you will hear back from us soon.
              </p>
            </div>
          )}
        </Card>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto bg-white rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-white">Done-for-You Posting</h3>
            <p className="text-sm text-gray-300">
              We create and publish TikToks for your business
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto bg-white rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-white">Warmed TikTok Account</h3>
            <p className="text-sm text-gray-300">
              We provide the account for maximum reach
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto bg-white rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-white">Just Share Your Link</h3>
            <p className="text-sm text-gray-300">
              Send your website or booking link — no other setup
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
