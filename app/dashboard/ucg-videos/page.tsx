"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function UcgVideosPage() {
  const [hook, setHook] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleCreateAds = async () => {
    if (!hook || !file) {
      alert("Please provide both a hook and upload a file");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement the API call to create UGC video
      console.log("Creating ads with:", { hook, file: file.name });
      
      // Placeholder for now
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      alert("Ads created successfully!");
    } catch (error) {
      console.error("Error creating ads:", error);
      alert("Failed to create ads. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Create UGC Ads</h1>

        <Card className="p-8 space-y-8 bg-black border border-zinc-800">
          {/* Step 1: Hook */}
          <div className="space-y-3">
            <label className="text-lg font-semibold text-white">
              1. Hook
            </label>
            <Input
              type="text"
              placeholder="Enter your hook text..."
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              className="w-full text-base bg-zinc-900 border-zinc-800 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Step 2: File Upload */}
          <div className="space-y-3">
            <label className="text-lg font-semibold text-white">
              2. Upload File
            </label>
            <div className="border-2 border-dashed border-zinc-800 rounded-lg p-8 text-center hover:border-zinc-700 transition-colors bg-zinc-900">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,video/*"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {file ? (
                  <>
                    <svg
                      className="w-12 h-12 text-green-500"
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
                    <span className="text-sm font-medium text-white">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      Click to change file
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-12 h-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <span className="text-sm font-medium text-white">
                      Click to upload
                    </span>
                    <span className="text-xs text-gray-400">
                      Images or videos up to 50MB
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Create Button */}
          <div className="pt-4">
            <Button
              onClick={handleCreateAds}
              disabled={!hook || !file || isLoading}
              className="w-full h-12 text-base font-semibold bg-white text-black hover:bg-gray-200 disabled:bg-zinc-800 disabled:text-gray-600"
              size="lg"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating Ads...
                </div>
              ) : (
                "Create Ads"
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

