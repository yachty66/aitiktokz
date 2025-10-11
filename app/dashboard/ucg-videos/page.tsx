"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

type UcgTemplate = {
  id: number;
  title: string;
  adPrompt: string;
  imageUrl: string | null;
  imageId: string | null;
  status: string;
};

type UcgVideo = {
  id: number;
  templateId: number;
  status: string;
  thumbnailUrl: string | null;
  bucketUrl: string | null;
  createdAt: Date;
};

const AD_TYPES = [
  "Excited Discovery - Just found it, have to share",
  "Casual Recommendation - Talking to camera like a friend",
  "In-the-Moment Demo - Showing while using it",
];

export default function UcgVideosPage() {
  const [hook, setHook] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<string>(AD_TYPES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [videos, setVideos] = useState<UcgVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // New state for template selection
  const [generatedTemplates, setGeneratedTemplates] = useState<UcgTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(new Set());
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [activeVideoIds, setActiveVideoIds] = useState<Set<number>>(new Set());
  const [activeTemplateIds, setActiveTemplateIds] = useState<Set<number>>(new Set());
  const [isWaitingForTemplates, setIsWaitingForTemplates] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    // Cleanup polling on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const pollVideoStatus = async (videoId: number) => {
    const response = await fetch(`/api/ucg-videos/${videoId}`);
    if (response.ok) {
      const { data, isDone } = await response.json();
      
      if (isDone) {
        // Remove from active polling
        setActiveVideoIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(videoId);
          return newSet;
        });
        
        // Refresh full video list
        fetchVideos();
      }
    }
  };

  const pollTemplateStatus = async (templateId: number) => {
    const response = await fetch(`/api/ucg-templates/${templateId}`);
    if (response.ok) {
      const { data } = await response.json();
      
      if (data.status === "DONE" && data.adPrompt) {
        // Update template in list
        setGeneratedTemplates((prev) =>
          prev.map((t) => (t.id === templateId ? data : t))
        );
        
        // Remove from active polling
        setActiveTemplateIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(templateId);
          return newSet;
        });
      }
    }
  };

  useEffect(() => {
    // Poll templates
    if (activeTemplateIds.size > 0) {
      const interval = setInterval(() => {
        activeTemplateIds.forEach((templateId) => {
          pollTemplateStatus(templateId);
        });
        
        // Check if all templates are done
        if (activeTemplateIds.size === 0 && isWaitingForTemplates) {
          setIsWaitingForTemplates(false);
          setShowTemplateModal(true);
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [activeTemplateIds, isWaitingForTemplates]);

  useEffect(() => {
    // Start/stop polling based on activeVideoIds
    if (activeVideoIds.size > 0 && !pollingInterval) {
      const interval = setInterval(() => {
        activeVideoIds.forEach((videoId) => {
          pollVideoStatus(videoId);
        });
      }, 5000);
      setPollingInterval(interval);
    } else if (activeVideoIds.size === 0 && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [activeVideoIds]);

  const fetchVideos = async () => {
    try {
      setIsLoadingVideos(true);
      const response = await fetch("/api/ucg-videos");
      if (response.ok) {
        const { data } = await response.json();
        setVideos(data);
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleCreateAds = async () => {
    if (!hook || !file || !selectedType) {
      alert("Please provide hook, file, and select an ad type");
      return;
    }

    setIsLoading(true);
    try {
      // Call n8n endpoint with file + title + type
      // n8n will create 1 ucgTemplate and return it
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", hook);
      formData.append("type", selectedType);

      const response = await fetch("/api/ucg-templates/generate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate template");
      }

      const responseData = await response.json();
      
      // n8n returns array with 1 template
      const templates = Array.isArray(responseData) ? responseData : responseData.data;

      if (!Array.isArray(templates) || templates.length === 0) {
        throw new Error("Invalid response from server");
      }

      const template = templates[0];

      // Start polling template for ad_prompt update
      setGeneratedTemplates([template]);
      setSelectedTemplates(new Set([template.id]));
      setActiveTemplateIds(new Set([template.id]));
      setIsWaitingForTemplates(true);
      
      alert("Generating prompt... Please wait while the script is created.");
      
      // Modal will show automatically when template is done

      // Reset form
      setHook("");
      setFile(null);

      // Reset file input
      const fileInput = document.getElementById(
        "file-upload"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error: any) {
      console.error("Error creating ads:", error);
      alert(`Failed to create ads: ${error.message || "Please try again."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVideos = async () => {
    if (selectedTemplates.size === 0) {
      alert("Please select at least one template");
      return;
    }

    setIsGenerating(true);
    setShowTemplateModal(false);

    try {
      // Generate video for each selected template
      const videoIds: number[] = [];

      for (const templateId of selectedTemplates) {
        const response = await fetch("/api/ucg-videos/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ templateId }),
        });

        if (response.ok) {
          const { data: video } = await response.json();
          videoIds.push(video.id);
        }
      }

      // Add video IDs to active polling (triggers useEffect to start polling)
      setActiveVideoIds(new Set(videoIds));

      // Refresh videos
      await fetchVideos();

      alert(
        `Generating ${videoIds.length} video(s). Check "My Videos" section below.`
      );
    } catch (error) {
      console.error("Error generating videos:", error);
      alert("Failed to generate videos. Please try again.");
    } finally {
      setIsGenerating(false);
      setGeneratedTemplates([]);
      setSelectedTemplates(new Set());
    }
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Loading Templates Overlay */}
        {isWaitingForTemplates && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <Card className="p-8 bg-zinc-900 border border-zinc-700 text-center">
              <div className="flex flex-col items-center gap-4">
                <Spinner className="size-12 text-white" />
                <h3 className="text-xl font-semibold text-white">
                  Generating Ad Scripts...
                </h3>
                <p className="text-gray-400">
                  AI is creating {activeTemplateIds.size} custom ad prompts
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Template Selection Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <Card className="max-w-4xl w-full p-8 bg-zinc-900 border border-zinc-700">
              <h2 className="text-2xl font-bold text-white mb-6">
                Select Templates to Generate Videos
              </h2>
              
              <div className="space-y-4 mb-8">
                {generatedTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplates((prev) => {
                        const newSet = new Set(prev);
                        if (newSet.has(template.id)) {
                          newSet.delete(template.id);
                        } else {
                          newSet.add(template.id);
                        }
                        return newSet;
                      });
                    }}
                    className="flex items-start gap-4 p-4 border border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTemplates.has(template.id)}
                      onChange={() => {}}
                      className="mt-1 h-5 w-5"
                    />
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-2">
                        Script #{template.id}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {template.adPrompt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setGeneratedTemplates([]);
                    setSelectedTemplates(new Set());
                  }}
                  variant="outline"
                  className="flex-1 bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerateVideos}
                  disabled={selectedTemplates.size === 0 || isGenerating}
                  className="flex-1 bg-white text-black hover:bg-gray-200"
                >
                  {isGenerating
                    ? "Generating..."
                    : `Generate ${selectedTemplates.size} Video(s)`}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Create Form Section */}
        <div>
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

          {/* Step 2: Ad Type Selection */}
          <div className="space-y-3">
            <label className="text-lg font-semibold text-white">
              2. Ad Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AD_TYPES.map((type, index) => {
                const shortName = type.split(" - ")[0];
                const description = type.split(" - ")[1];
                const icons = [
                  // Excited Discovery
                  <svg key="icon1" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>,
                  // Casual Recommendation
                  <svg key="icon2" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                  </svg>,
                  // In-the-Moment Demo
                  <svg key="icon3" className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ];
                
                return (
                  <div
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedType === type
                        ? "border-white bg-zinc-800"
                        : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className={selectedType === type ? "text-white" : "text-gray-400"}>
                        {icons[index]}
                      </div>
                      <p className="text-sm text-white font-semibold">
                        {shortName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: File Upload */}
          <div className="space-y-3">
            <label className="text-lg font-semibold text-white">
              3. Upload File
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
              disabled={!hook || !file || isLoading || isGenerating}
              className="w-full h-12 text-base font-semibold bg-white text-black hover:bg-gray-200 disabled:bg-zinc-800 disabled:text-gray-600"
              size="lg"
            >
              {isLoading || isGenerating ? (
                <div className="flex items-center gap-2">
                  <Spinner />
                  {isGenerating ? "Generating Videos..." : "Creating Prompt..."}
                </div>
              ) : (
                "Create Prompts"
              )}
            </Button>
          </div>
        </Card>
        </div>

        {/* My Videos Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              My Videos ({videos.length})
              {activeVideoIds.size > 0 && (
                <span className="ml-3 text-sm text-yellow-500 animate-pulse">
                  • Generating {activeVideoIds.size} video(s)...
                </span>
              )}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchVideos}
              disabled={isLoadingVideos}
              className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800"
            >
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {isLoadingVideos ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[9/16] bg-zinc-900 rounded-lg animate-pulse"
                />
              ))
            ) : videos.length === 0 ? (
              // Empty state skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[9/16] bg-zinc-900 rounded-lg border-2 border-dashed border-zinc-800 flex items-center justify-center"
                >
                  <div className="text-center text-zinc-600 text-sm">
                    No video
                  </div>
                </div>
              ))
            ) : (
              // Actual videos
              videos.map((video) => (
                <div
                  key={video.id}
                  className="aspect-[9/16] bg-zinc-900 rounded-lg overflow-hidden relative group cursor-pointer hover:ring-2 hover:ring-white transition-all"
                >
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={`Video ${video.id}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <svg
                        className="w-12 h-12"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        video.status === "DONE"
                          ? "bg-green-500 text-white"
                          : video.status === "FAILED"
                          ? "bg-red-500 text-white"
                          : "bg-yellow-500 text-black"
                      }`}
                    >
                      {video.status}
                    </span>
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <svg
                      className="w-12 h-12 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination placeholder */}
          {videos.length > 0 && (
            <div className="mt-6 flex items-center justify-center gap-2 text-zinc-400 text-sm">
              <button className="px-3 py-1 hover:text-white transition-colors">
                ←
              </button>
              <span>Page 1 of 1</span>
              <button className="px-3 py-1 hover:text-white transition-colors">
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

