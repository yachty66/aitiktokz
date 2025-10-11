"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface TemplateData {
  images: string[];
}

interface Template {
  id: string;
  data: TemplateData;
  views?: number;
  likes?: number;
}

export default function SlideshowsPage() {
  const [prompt, setPrompt] = useState("");
  const [speed, setSpeed] = useState("1.0x");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingTemplateId, setAnalyzingTemplateId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (showTemplateModal) {
      loadTemplates();
    }
  }, [showTemplateModal]);

  const loadTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("slideshow-templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err) {
      console.error("Error loading templates:", err);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,600px] gap-6">
        {/* Left Side - Input Section */}
        <div className="space-y-6">
          {/* Prompt Section */}
          <Card className="bg-black border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">1. Prompt</h2>
              <span className="text-xs text-white/60 flex items-center gap-1">
                <span className="w-2 h-2 bg-white/60 rounded-full"></span>
                No Product Context
              </span>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Add any additional context for generation..."
              className="w-full min-h-[200px] bg-white/5 border border-white/10 rounded-md p-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
            />
            <Button
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/5"
              onClick={() => setShowTemplateModal(true)}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z"
                />
              </svg>
              Start with template
            </Button>
          </Card>

          {/* Images Section */}
          <Card className="bg-black border border-white/10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">2. Images</h2>
              <span className="text-xs text-white/60 flex items-center gap-1">
                <span className="w-2 h-2 bg-white/60 rounded-full"></span>
                No image collection selected
              </span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-md h-[160px] flex items-center justify-center">
              <p className="text-white/40 text-sm">
                Select an image collection to get started
              </p>
            </div>
          </Card>

          {/* Generate Button */}
          <Button className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-6 text-lg">
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Generate
          </Button>
        </div>

        {/* Right Side - Preview Editor */}
        <Card className="bg-black border border-white/10 p-6 space-y-4 h-fit sticky top-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview Editor</h2>
            <div className="flex items-center gap-2">
              <select
                value={speed}
                onChange={(e) => setSpeed(e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="1x">1x</option>
                <option value="1.0x">1.0x</option>
                <option value="2x">2x</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/5"
              >
                Expand View
              </Button>
            </div>
          </div>

          {/* Preview Area */}
          <div className="bg-white/5 border border-white/10 rounded-md aspect-[9/16] flex items-center justify-center">
            <p className="text-white/40 text-sm">No preview available</p>
          </div>

          {/* Editor Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/5"
            >
              2s
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/5"
            >
              4:5
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </Button>
          </div>

          {/* Thumbnail Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-12 h-12 bg-white/5 border border-white/10 rounded"
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 w-12 h-12 border-white/20 text-white hover:bg-white/5"
            >
              +
            </Button>
          </div>

          {/* Export Button */}
          <Button className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-4 text-lg">
            Export
          </Button>
        </Card>
      </div>

      {/* Bottom Section - Exported & Drafts */}
      <div className="mt-12 space-y-6">
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-white/10">
          <button className="pb-3 border-b-2 border-white font-semibold">
            Exported Slideshows (3)
          </button>
          <button className="pb-3 text-white/50 hover:text-white">
            Drafts (4)
          </button>
          <div className="ml-auto flex items-center gap-2 pb-3">
            <span className="text-sm text-white/50">Page 1 of 1</span>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/5"
              disabled
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/5"
              disabled
            >
              ›
            </Button>
          </div>
        </div>

        {/* Grid of Slideshows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card
              key={i}
              className="bg-white/5 border border-white/10 p-3 space-y-3 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="aspect-[9/16] bg-gradient-to-br from-white/10 to-white/5 rounded-md"></div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-white truncate">
                  Slideshow {i + 1}
                </p>
                <p className="text-xs text-white/50">
                  Created {i + 1} days ago
                </p>
              </div>
            </Card>
          ))}

          {/* Empty State */}
          {[...Array(1)].map((_, i) => (
            <Card
              key={`empty-${i}`}
              className="bg-white/5 border border-white/10 border-dashed p-3 flex items-center justify-center aspect-[9/16] hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-2 text-white/30"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <p className="text-xs text-white/50">Create new</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Template Library Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-7xl max-h-[90vh] mx-4 bg-black border border-white/20 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Slideshow Library</h2>
                <span className="text-sm text-white/60">
                  <span className="w-2 h-2 bg-white/60 rounded-full inline-block mr-2"></span>
                  No Product Context
                </span>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search slideshows..."
                    className="w-full bg-white/5 border border-white/10 rounded-md pl-10 pr-4 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/5"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  Display
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/5"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                    />
                  </svg>
                  Sort
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/5"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  Filter
                </Button>
                {isAnalyzing && (
                  <div className="ml-4 text-sm text-white/60">
                    Analyzing slides… this may take a few seconds
                  </div>
                )}
              </div>
            </div>

            {/* Templates Grid */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-white/60">Loading templates...</div>
                </div>
              ) : templates.length === 0 ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 text-white/30"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-white/60">No templates found</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {templates.map((template) => {
                    const firstImage = template.data?.images?.[0];
                    return (
                      <Card
                        key={template.id}
                        className="bg-white/5 border border-white/10 overflow-hidden hover:bg-white/10 transition-colors cursor-pointer group"
                      >
                        {/* Template Preview */}
                        <div className="relative aspect-[9/16] bg-white/5">
                          {firstImage ? (
                            <img
                              src={firstImage}
                              alt="Template preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-white/30">
                              No preview
                            </div>
                          )}
                          {/* Play icon overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg
                              className="w-12 h-12 text-white"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="p-3 space-y-2">
                          <div className="flex items-center gap-3 text-sm text-white/80">
                            <div className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                              <span>{template.views || 0}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                              </svg>
                              <span>{template.likes || 0}</span>
                            </div>
                          </div>

                          {/* Get Prompt Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isAnalyzing}
                            className="w-full border-white/20 text-white hover:bg-white/5 disabled:opacity-60 disabled:cursor-not-allowed"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                setIsAnalyzing(true);
                                setAnalyzingTemplateId(template.id);
                                const images =
                                  template.data?.images?.filter(Boolean) ?? [];
                                if (images.length === 0) return;
                                const res = await fetch(
                                  "/api/slideshows/analyze",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      images,
                                      context: prompt,
                                    }),
                                  }
                                );
                                if (!res.ok)
                                  throw new Error("Failed to analyze");
                                const json = (await res.json()) as {
                                  prompt?: string;
                                };
                                if (json.prompt) setPrompt(json.prompt);
                                setShowTemplateModal(false);
                              } catch (err) {
                                console.error("Analyze error", err);
                              } finally {
                                setIsAnalyzing(false);
                                setAnalyzingTemplateId(null);
                              }
                            }}
                          >
                            {isAnalyzing &&
                            analyzingTemplateId === template.id ? (
                              <span className="inline-flex items-center gap-2">
                                <svg
                                  className="w-4 h-4 animate-spin text-white"
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
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                  ></path>
                                </svg>
                                Analyzing…
                              </span>
                            ) : (
                              "+ Get Prompt"
                            )}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
