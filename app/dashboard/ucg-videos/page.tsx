"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  const [model, setModel] = useState<string>("sora-2");
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Template editing and preview state
  const [generatedTemplates, setGeneratedTemplates] = useState<UcgTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<number>>(new Set());
  const [editingTemplate, setEditingTemplate] = useState<UcgTemplate | null>(null);
  const [adPromptText, setAdPromptText] = useState("");
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<UcgVideo | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<number | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [activeVideoIds, setActiveVideoIds] = useState<Set<number>>(new Set());
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<UcgVideo | null>(null);

  // Thumbnail fallback component that shows the first frame of the video
  const VideoThumbnail: React.FC<{ src: string }> = ({ src }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    useEffect(() => {
      const videoEl = videoRef.current;
      if (!videoEl) return;
      const handleLoaded = () => {
        try {
          // Seek to a tiny offset to force a decoded frame without autoplay
          videoEl.currentTime = 0.1;
        } catch {}
      };
      const handleSeeked = () => {
        try {
          videoEl.pause();
        } catch {}
      };
      videoEl.addEventListener("loadedmetadata", handleLoaded);
      videoEl.addEventListener("seeked", handleSeeked);
      return () => {
        videoEl.removeEventListener("loadedmetadata", handleLoaded);
        videoEl.removeEventListener("seeked", handleSeeked);
      };
    }, [src]);
    return (
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />
    );
  };

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

  // Template polling removed: webhook now responds when finished

  // Removed template polling effect

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

  // Preview video polling
  useEffect(() => {
    if (!previewVideoId) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/ucg-videos/${previewVideoId}`);
      if (!res.ok) return;
      const { data, isDone } = await res.json();
      if (cancelled) return;
      if (isDone) {
        setPreviewVideo(data);
        clearInterval(interval);
      }
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [previewVideoId]);

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
      
      // n8n now waits for completion: expect API to return finalized template
      const templates = Array.isArray(responseData) ? responseData : responseData.data;
      if (!Array.isArray(templates) || templates.length === 0) {
        throw new Error("Invalid response from server");
      }
      const template: UcgTemplate = templates[0];

      if (!template.adPrompt) {
        throw new Error("Template missing ad prompt in response");
      }

      // Enter edit mode with prompt and show preview pane
      setGeneratedTemplates([template]);
      setSelectedTemplates(new Set([template.id]));
      setEditingTemplate(template);
      setAdPromptText(template.adPrompt || "");

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

  const handleSaveAndGenerate = async () => {
    if (!editingTemplate) return;
    try {
      setIsSavingPrompt(true);
      await fetch(`/api/ucg-templates/${editingTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adPrompt: adPromptText })
      });
    } catch (e) {
      console.error("Failed to save prompt", e);
      alert("Failed to save prompt");
      setIsSavingPrompt(false);
      return;
    }
    setIsSavingPrompt(false);
    try {
      setIsGeneratingPreview(true);
      const response = await fetch("/api/ucg-videos/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: editingTemplate.id, model }),
      });
      if (!response.ok) throw new Error("Failed to start generation");
      const { data: video } = await response.json();
      setPreviewVideo(null);
      setPreviewVideoId(video.id);
      // Also track in global list
      setActiveVideoIds((prev) => new Set([...prev, video.id]));
    } catch (e) {
      console.error("Failed to generate video", e);
      alert("Failed to generate video");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Video Dialog */}
        <Dialog open={isVideoDialogOpen} onOpenChange={setIsVideoDialogOpen}>
          <DialogContent className="sm:max-w-[520px] md:max-w-[560px] lg:max-w-[640px] bg-black border-zinc-800 rounded-xl p-8">
            <div className="w-full">
              {selectedVideo?.bucketUrl ? (
                <div className="aspect-[9/16] w-full overflow-hidden rounded-md">
                  <video src={selectedVideo.bucketUrl} controls className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-zinc-500">
                  No video available
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        {/* Loading Templates Overlay */}
        {/* Removed waiting overlay since webhook responds when finished */}

        {/* Unified Form + Output Layout */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-8">Create UGC Ads</h1>

          <Card className="p-8 bg-black border border-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: Inputs */}
              <div className="space-y-8">
                {/* Step 1: Hook */}
                <div className="space-y-3">
                  <label className="text-lg font-semibold text-white">
                    1. Product Name
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

                {/* Step 3: Model */}
                <div className="space-y-3">
                  <label className="text-lg font-semibold text-white">
                    3. Model
                  </label>
                  <div className="w-full">
                    <Select value={model} onValueChange={(v: string) => setModel(v)}>
                      <SelectTrigger className="w-full bg-zinc-900 border-zinc-800 text-white">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Models</SelectLabel>
                          <SelectItem value="sora-2">sora-2</SelectItem>
                          <SelectItem value="sora-2-pro">sora-2-pro</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Step 4: File Upload */}
                <div className="space-y-3">
                  <label className="text-lg font-semibold text-white">
                    4. Upload File
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
              </div>

              {/* Right: Output */}
              <div className="flex flex-col">
                <h3 className="text-white font-semibold mb-3">Output</h3>
                {/* When a video is ready, show the video */}
                {previewVideo && previewVideo.status === "DONE" && previewVideo.bucketUrl ? (
                  <div className="aspect-[9/16] w-full bg-black rounded-lg overflow-hidden border border-zinc-800">
                    <video src={previewVideo.bucketUrl} controls className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <>
                    {/* Show prompt if available; otherwise placeholder */}
                    <div className="w-full min-h-72 max-h-[60vh] bg-zinc-900 border border-zinc-800 rounded-md p-4 text-white overflow-auto">
                      {editingTemplate ? (
                        <pre className="whitespace-pre-wrap text-sm leading-6">{adPromptText}</pre>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-zinc-500 text-sm">
                          The generated ad prompt will appear here after you create it.
                        </div>
                      )}
                    </div>

                    {/* Action button */}
                    <div className="flex gap-3 mt-4">
                      <Button
                        onClick={handleSaveAndGenerate}
                        disabled={!editingTemplate || isSavingPrompt || isGeneratingPreview}
                        className="bg-white text-black hover:bg-gray-200 disabled:bg-zinc-800 disabled:text-gray-600"
                      >
                        {previewVideoId && !previewVideo ? (
                          <div className="flex items-center gap-2">
                            <Spinner />
                            Generating video...
                          </div>
                        ) : isSavingPrompt || isGeneratingPreview ? (
                          "Saving & Generating..."
                        ) : (
                          "Save & Generate Video"
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </div>
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
                  • Generating video...
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
                  onClick={() => {
                    setSelectedVideo(video);
                    setIsVideoDialogOpen(true);
                  }}
                >
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={`Video ${video.id}`}
                      className="w-full h-full object-cover"
                    />
                  ) : video.bucketUrl ? (
                    <VideoThumbnail src={video.bucketUrl} />
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

