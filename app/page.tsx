"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignup = async () => {
    try {
      setIsLoading(true);
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      // supabase will redirect; no further action needed here
    } catch (err) {
      console.error(err);
      alert("Google sign-in failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-4xl mx-auto text-center space-y-8">
        {/* Header Section */}
        <div className="relative space-y-4">
          <Image
            src="/mascot.jpeg"
            alt="Mascot"
            width={160}
            height={160}
            priority
            className="absolute -top-20 left-1/2 -translate-x-1/2 drop-shadow-lg"
          />
          <h1 className="text-6xl md:text-7xl font-bold text-pink-500 leading-tight text-balance">
            AI TikTok that Drive Sales
          </h1>
          <p className="text-xl md:text-2xl text-white max-w-2xl mx-auto text-pretty">
            We provide the warmed TikTok account and handle posting end-to-end.
            You just share your business link.
          </p>
        </div>

        {/* Auth Card */}
        <Card className="max-w-md mx-auto p-8 bg-white/5 backdrop-blur-md border border-white/10 shadow-xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white">Sign up</h2>
              <p className="text-gray-300">Continue with your Google account</p>
            </div>
            <Button
              onClick={handleGoogleSignup}
              disabled={isLoading}
              className="w-full bg-white text-black hover:bg-gray-200 font-semibold py-3"
            >
              {isLoading ? "Redirecting…" : "Sign up with Google"}
            </Button>
          </div>
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
            <p className="text-sm text-white">
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
            <p className="text-sm text-white">
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
            <p className="text-sm text-white">
              Send your website or booking link — no other setup
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
