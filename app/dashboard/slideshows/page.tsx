"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Type } from "lucide-react";
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
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingTemplateId, setAnalyzingTemplateId] = useState<string | null>(
    null
  );
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewTexts, setPreviewTexts] = useState<string[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [editingOriginal, setEditingOriginal] = useState<string>("");
  const editingRef = useRef<HTMLDivElement | null>(null);
  const seededRef = useRef<boolean>(false);
  const [durations, setDurations] = useState<number[]>([]);
  const [openDurationFor, setOpenDurationFor] = useState<number | null>(null);
  const durationMenuRef = useRef<HTMLDivElement | null>(null);
  const [durationMenuPos, setDurationMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const durationMenuPortalRef = useRef<HTMLDivElement | null>(null);
  const [textBoxes, setTextBoxes] = useState<
    { x: number; y: number; widthPct: number }[]
  >([]);
  const [dragMode, setDragMode] = useState<
    "none" | "move" | "resize-l" | "resize-r"
  >("none");
  const dragStart = useRef<{
    x: number;
    y: number;
    slideIdx: number;
    box: { x: number; y: number; widthPct: number };
    rect: DOMRect;
    boxPxW?: number;
    boxPxH?: number;
  } | null>(null);
  const [aspect, setAspect] = useState<"1:1" | "4:5" | "3:4" | "9:16">("4:5");
  const [openAspectFor, setOpenAspectFor] = useState<number | null>(null);
  const aspectMenuRef = useRef<HTMLDivElement | null>(null);
  const aspectMenuPortalRef = useRef<HTMLDivElement | null>(null);
  const [aspectMenuPos, setAspectMenuPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSlideshows, setExportedSlideshows] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 12; // cards per page
  const [cardSlideIndex, setCardSlideIndex] = useState<Record<string, number>>(
    {}
  );
  const [shareModal, setShareModal] = useState<{
    open: boolean;
    slideshow: any | null;
  }>({ open: false, slideshow: null });

  // Helpers to composite text over images and upload to S3 before export
  function getCanvasSizeForAspect(a: "1:1" | "4:5" | "3:4" | "9:16") {
    if (a === "1:1") return { width: 1080, height: 1080 };
    if (a === "4:5") return { width: 1080, height: 1350 };
    if (a === "3:4") return { width: 1080, height: 1440 };
    return { width: 1080, height: 1920 };
  }

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Route through same-origin proxy to avoid CORS tainting
      const proxied = `/api/image-proxy?url=${encodeURIComponent(src)}`;
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = proxied;
    });
  }

  function drawImageCover(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    cw: number,
    ch: number
  ) {
    const scale = Math.max(cw / img.width, ch / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (cw - w) / 2;
    const y = (ch - h) / 2;
    ctx.drawImage(img, x, y, w, h);
  }

  function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const lines: string[] = [];
    const paragraphs = (text || "").split(/\n+/);
    for (const p of paragraphs) {
      const words = p.split(/\s+/);
      let current = "";
      for (const w of words) {
        const next = current ? current + " " + w : w;
        if (ctx.measureText(next).width <= maxWidth) current = next;
        else {
          if (current) lines.push(current);
          current = w;
        }
      }
      if (current) lines.push(current);
    }
    return lines.length ? lines : [""];
  }

  async function compositeAndUploadSlide(
    imageUrl: string,
    text: string,
    box: { x: number; y: number; widthPct: number },
    a: "1:1" | "4:5" | "3:4" | "9:16",
    index: number
  ): Promise<string> {
    const { width, height } = getCanvasSizeForAspect(a);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D unsupported");

    const img = await loadImage(imageUrl);
    drawImageCover(ctx, img, width, height);

    const boxWidth =
      (Math.max(10, Math.min(95, box?.widthPct ?? 85)) / 100) * width;
    const cx = (Math.min(100, Math.max(0, box?.x ?? 50)) / 100) * width;
    const cy = (Math.min(100, Math.max(0, box?.y ?? 50)) / 100) * height;

    let fontSize = Math.round(width * 0.06);
    fontSize = Math.max(28, Math.min(96, fontSize));
    ctx.font = `${fontSize}px Inter, system-ui, -apple-system, Segoe UI, Roboto`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    const lines = wrapText(ctx, text || "", boxWidth);
    const lineHeight = Math.round(fontSize * 1.2);
    const totalH = lineHeight * lines.length;
    let y = cy - totalH / 2 + lineHeight / 2;
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#fff";
    ctx.lineWidth = Math.round(fontSize * 0.18);
    for (const line of lines) {
      ctx.strokeText(line, cx, y, boxWidth);
      ctx.fillText(line, cx, y, boxWidth);
      y += lineHeight;
    }

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b as Blob), "image/jpeg", 0.92)
    );

    const fileName = `slide-${Date.now()}-${index}.jpg`;
    // Use server-side upload to avoid bucket CORS requirements
    const fd = new FormData();
    fd.append("file", blob, fileName);
    const up = await fetch("/api/upload", { method: "POST", body: fd });
    let json: any = null;
    try {
      json = await up.json();
    } catch {}
    if (!up.ok || !json?.publicUrl) {
      console.error("Upload response", up.status, json);
      throw new Error("Upload failed");
    }
    return json.publicUrl as string;
  }

  function moveItem<T>(list: T[], from: number, to: number): T[] {
    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  function deleteSlideAt(index: number) {
    // Remove across all parallel arrays
    setPreviewImages((prev) => prev.filter((_, i) => i !== index));
    setPreviewTexts((prev) => prev.filter((_, i) => i !== index));
    setTextBoxes((prev) => prev.filter((_, i) => i !== index));
    setDurations((prev) => prev.filter((_, i) => i !== index));

    // Adjust indices/states that reference slides
    const newLen = Math.max(previewImages.length - 1, 0);
    setCurrentSlide((curr) => (newLen ? Math.min(index, newLen - 1) : 0));
    if (editingSlide !== null) {
      if (editingSlide === index) setEditingSlide(null);
      else if (editingSlide > index) setEditingSlide(editingSlide - 1);
    }
    if (imagePickerForSlide !== null) {
      if (imagePickerForSlide === index) setImagePickerForSlide(null);
      else if (imagePickerForSlide > index)
        setImagePickerForSlide(imagePickerForSlide - 1);
    }
    setOpenDurationFor(null);
    setDurationMenuPos(null);
    setOpenAspectFor(null);
    setAspectMenuPos(null);
  }

  // Auto-scroll the preview strip to keep the focused slide in view
  useEffect(() => {
    const container = stripRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLElement>(
      `[data-slide-idx="${currentSlide}"]`
    );
    if (!el) return;
    el.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentSlide]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!durationMenuRef.current) return;
      if (!(e.target instanceof Node)) return;
      const insideButton = durationMenuRef.current.contains(e.target);
      const insidePortal =
        !!durationMenuPortalRef.current &&
        durationMenuPortalRef.current.contains(e.target);
      if (!insideButton && !insidePortal) {
        setOpenDurationFor(null);
        setDurationMenuPos(null);
      }
    }
    if (openDurationFor !== null) {
      document.addEventListener("mousedown", onClickOutside);
      const onResize = () => {
        setOpenDurationFor(null);
        setDurationMenuPos(null);
      };
      window.addEventListener("resize", onResize);
      return () => {
        document.removeEventListener("mousedown", onClickOutside);
        window.removeEventListener("resize", onResize);
      };
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openDurationFor]);
  useEffect(() => {
    if (editingSlide !== null) {
      // Seed again on each start and focus the editor
      seededRef.current = false;
      requestAnimationFrame(() => {
        const el = editingRef.current as HTMLElement | null;
        if (el) {
          try {
            el.focus();
            const range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
          } catch {}
        }
      });
    }
  }, [editingSlide]);
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!(e.target instanceof Node)) return;
      const insideBtn =
        !!aspectMenuRef.current && aspectMenuRef.current.contains(e.target);
      const insidePortal =
        !!aspectMenuPortalRef.current &&
        aspectMenuPortalRef.current.contains(e.target);
      if (!insideBtn && !insidePortal) {
        setOpenAspectFor(null);
        setAspectMenuPos(null);
      }
    }
    if (openAspectFor !== null) {
      document.addEventListener("mousedown", onClickOutside);
      const onResize = () => {
        setOpenAspectFor(null);
        setAspectMenuPos(null);
      };
      window.addEventListener("resize", onResize);
      return () => {
        document.removeEventListener("mousedown", onClickOutside);
        window.removeEventListener("resize", onResize);
      };
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openAspectFor]);
  // Image collections modal state
  const [isImagesModalOpen, setIsImagesModalOpen] = useState(false);
  const [imageSearch, setImageSearch] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null
  );
  const [appliedCollection, setAppliedCollection] = useState<string | null>(
    null
  );
  // When opening modal from a slide, remember the slide index so we can replace its image
  const [imagePickerForSlide, setImagePickerForSlide] = useState<number | null>(
    null
  );
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [isModalImagesLoading, setIsModalImagesLoading] = useState(false);

  // Placeholder collections for UI (replace with real data source later)
  const exampleCollections = [
    "Pinterest – UGC Entrepreneur",
    "Pinterest – UGC Selfie Couples",
    "Pinterest – NYC Lifestyle",
    "Tumblr – slinkybarbie",
    "Tumblr – saltedpeach",
    "Pinterest – Faceless Selfies",
    "Pinterest – Surrealism",
    "Pinterest – Fall Evening",
    "Pinterest – Summer Lake",
    "Pinterest – School",
    "Pinterest – Running",
    "Pinterest – Gym",
    "Aesthetic Books",
  ];
  const filteredCollections = exampleCollections.filter((name) =>
    name.toLowerCase().includes(imageSearch.toLowerCase())
  );

  function prefixForCollection(name: string): string {
    // Map friendly names to S3 prefixes; extend as you add collections
    const map: Record<string, string> = {
      "Pinterest – Surrealism": "pinterest-surrealism/",
      "Pinterest – School": "pinterest-school/",
    };
    return map[name] || "pinterest-surrealism/";
  }

  async function loadCollectionImages(name: string) {
    setIsModalImagesLoading(true);
    setModalImages([]);
    try {
      const prefix = prefixForCollection(name);
      const res = await fetch(
        `/api/images/list?limit=27&prefix=${encodeURIComponent(prefix)}`
      );
      if (!res.ok) throw new Error("Failed to list images");
      const data = (await res.json()) as { images?: string[] };
      setModalImages(data.images || []);
    } catch (err) {
      console.error("loadCollectionImages error", err);
      setModalImages([]);
    } finally {
      setIsModalImagesLoading(false);
    }
  }

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

  // Load exported slideshows from Supabase
  const loadExports = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      // resolve user email once
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const email = user?.email ?? null;
      setUserEmail(email);

      // helper to run the base select with safe ordering
      const runSelect = async (scoped: boolean) => {
        let q = supabase.from("exported_slideshows").select("*");
        if (scoped && email) {
          q = q.eq("user_email", email);
        }
        // attempt order by created_at; if fails (column missing), fall back to id
        let { data, error } = await q.order("created_at", { ascending: false });
        if (error && (error as any)?.code === "42703") {
          // column does not exist
          const res = await q.order("id", { ascending: false });
          data = res.data;
          error = res.error;
        }
        if (error) throw error;
        return data || [];
      };

      // try scoped first; if none, fall back to unscoped (helps older rows without user_email)
      let rows = await runSelect(true);
      if ((!rows || rows.length === 0) && !email) {
        // if no email, we already queried unscoped by nature; nothing else to do
      } else if (!rows || rows.length === 0) {
        rows = await runSelect(false);
      }

      setExportedSlideshows(rows);
    } catch (err) {
      console.error("Error loading exports:", err);
    }
  };

  useEffect(() => {
    loadExports();
  }, []);

  // Reset to first page whenever the dataset changes
  useEffect(() => {
    setPage(1);
  }, [exportedSlideshows.length]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="grid grid-cols-1 lg:grid-cols-[480px,1fr] gap-6">
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
              <span className="text-xs text-white/60 flex items-center gap-2">
                <span
                  className={
                    appliedCollection
                      ? "w-2 h-2 bg-white rounded-full"
                      : "w-2 h-2 bg-white/60 rounded-full"
                  }
                />
                {appliedCollection || "No image collection selected"}
              </span>
            </div>
            <button
              onClick={() => setIsImagesModalOpen(true)}
              className="bg-white/5 border border-white/10 rounded-md h-[160px] flex items-center justify-center w-full hover:bg-white/10 transition-colors"
            >
              <p className="text-white/40 text-sm">
                Select an image collection to get started
              </p>
            </button>
          </Card>

          {/* Generate Button */}
          <Button
            className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-6 text-lg"
            onClick={async () => {
              try {
                setIsPreviewLoading(true);
                // Step 1: Ask server to infer number of slides + generate texts, and pick images
                const res = await fetch("/api/slides/generate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    prompt,
                    prefix: "pinterest-surrealism/",
                  }),
                });
                if (!res.ok) throw new Error("Failed to generate slides");
                const data = (await res.json()) as {
                  numSlides?: number;
                  slides?: { text: string; image: string }[];
                };
                const imgs = (data.slides || []).map((s) => s.image);
                const txts = (data.slides || []).map((s) => s.text);
                setPreviewImages(imgs);
                setPreviewTexts(txts);
                setTextBoxes(txts.map(() => ({ x: 50, y: 50, widthPct: 85 })));
                setDurations(txts.map(() => 2));
                setCurrentSlide(0);
              } catch (e) {
                console.error("Load random images error", e);
              } finally {
                setIsPreviewLoading(false);
              }
            }}
            disabled={isPreviewLoading}
          >
            {isPreviewLoading ? "Loading…" : "Generate"}
          </Button>
        </div>

        {/* Right Side - Preview Editor */}
        <Card className="bg-black border border-white/10 p-6 space-y-4 self-start max-h-[720px] overflow-hidden">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview Editor</h2>
          </div>

          {/* Preview Area */}
          <div className="bg-white/5 border border-white/10 rounded-md h-[380px] md:h-[430px] flex items-center overflow-hidden relative">
            {previewImages.length === 0 ? (
              <div className="w-full flex items-center justify-center">
                <p className="text-white/40 text-sm">No preview available</p>
              </div>
            ) : (
              <div
                ref={stripRef}
                className="w-full h-full overflow-x-auto flex items-center gap-8 px-6 snap-x snap-mandatory"
              >
                {previewImages.map((src, idx) => (
                  <div
                    key={idx}
                    data-slide-idx={idx}
                    className={`snap-center flex-shrink-0 flex flex-col items-center ${
                      idx === currentSlide ? "scale-100" : "scale-95 opacity-90"
                    } transition-transform`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setCurrentSlide(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setCurrentSlide(idx);
                    }}
                  >
                    <div
                      className={`w-44 ${
                        aspect === "1:1"
                          ? "aspect-square"
                          : aspect === "4:5"
                          ? "aspect-[4/5]"
                          : aspect === "3:4"
                          ? "aspect-[3/4]"
                          : "aspect-[9/16]"
                      } bg-black/40 rounded-md overflow-hidden shadow relative`}
                      data-slide-container={idx}
                      onMouseMove={(e) => {
                        if (dragMode === "none") return;
                        const ds = dragStart.current;
                        if (!ds || ds.slideIdx !== idx) return;
                        const dx = e.clientX - ds.x;
                        const dy = e.clientY - ds.y;
                        const w = ds.rect.width || 1;
                        const h = ds.rect.height || 1;
                        if (dragMode === "move") {
                          // Constrain using current editable box size (if available)
                          const boxW = dragStart.current?.boxPxW || 0;
                          const boxH = dragStart.current?.boxPxH || 0;
                          const halfWPct = (boxW / 2 / w) * 100;
                          const halfHPct = (boxH / 2 / h) * 100;
                          const nx = Math.min(
                            100 - halfWPct,
                            Math.max(halfWPct, ds.box.x + (dx / w) * 100)
                          );
                          const ny = Math.min(
                            100 - halfHPct,
                            Math.max(halfHPct, ds.box.y + (dy / h) * 100)
                          );
                          setTextBoxes((prev) => {
                            const next = [...prev];
                            next[idx] = {
                              ...((next[idx] as any) || {
                                x: 50,
                                y: 50,
                                widthPct: 85,
                              }),
                              x: nx,
                              y: ny,
                            };
                            return next;
                          });
                        } else if (
                          dragMode === "resize-l" ||
                          dragMode === "resize-r"
                        ) {
                          const deltaPct = (dx / w) * 100;
                          const signed =
                            dragMode === "resize-l" ? -deltaPct : deltaPct;
                          const nw = Math.min(
                            95,
                            Math.max(10, ds.box.widthPct + signed)
                          );
                          setTextBoxes((prev) => {
                            const next = [...prev];
                            next[idx] = {
                              ...((next[idx] as any) || {
                                x: 50,
                                y: 50,
                                widthPct: 85,
                              }),
                              widthPct: nw,
                            };
                            return next;
                          });
                        }
                      }}
                      onMouseUp={() => {
                        setDragMode("none");
                        dragStart.current = null;
                      }}
                      onMouseLeave={() => {
                        setDragMode("none");
                        dragStart.current = null;
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt="preview"
                        className="w-full h-full object-cover"
                      />
                      {editingSlide === idx ? (
                        <div
                          className="absolute p-0 z-10"
                          style={{
                            left: `${textBoxes[idx]?.x ?? 50}%`,
                            top: `${textBoxes[idx]?.y ?? 50}%`,
                            width: `${textBoxes[idx]?.widthPct ?? 85}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <div
                            className="absolute -top-6 left-0 right-0 h-5 cursor-move flex items-center justify-center text-[10px] text-black bg-white/90 rounded-t"
                            onMouseDown={(e) => {
                              const container =
                                (e.currentTarget.parentElement
                                  ?.parentElement as HTMLElement) || undefined;
                              const rect = container?.getBoundingClientRect();
                              if (!rect) return;
                              setDragMode("move");
                              const boxEl =
                                editingRef.current as HTMLElement | null;
                              const boxRect = boxEl?.getBoundingClientRect();
                              dragStart.current = {
                                x: e.clientX,
                                y: e.clientY,
                                slideIdx: idx,
                                box: textBoxes[idx] || {
                                  x: 50,
                                  y: 50,
                                  widthPct: 85,
                                },
                                rect,
                                boxPxW: boxRect?.width,
                                boxPxH: boxRect?.height,
                              };
                            }}
                          >
                            Drag
                          </div>
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            role="textbox"
                            aria-label="Edit text"
                            ref={editingRef}
                            onInput={(e) => {
                              // keep internal state but do not re-render contentEditable value
                              setEditingValue(
                                (e.target as HTMLElement).innerText
                              );
                            }}
                            onKeyDown={(e) => {
                              if (
                                (e.metaKey || e.ctrlKey) &&
                                e.key === "Enter"
                              ) {
                                const text = (e.currentTarget as HTMLElement)
                                  .innerText;
                                setPreviewTexts((prev) => {
                                  const next = [...prev];
                                  next[idx] = text;
                                  return next;
                                });
                                setEditingSlide(null);
                                e.preventDefault();
                              } else if (e.key === "Escape") {
                                (e.currentTarget as HTMLElement).innerText =
                                  editingOriginal;
                                setEditingValue(editingOriginal);
                                setEditingSlide(null);
                                e.preventDefault();
                              }
                            }}
                            onBlur={(e) => {
                              const text = (e.currentTarget as HTMLElement)
                                .innerText;
                              setPreviewTexts((prev) => {
                                const next = [...prev];
                                next[idx] = text;
                                return next;
                              });
                              const container =
                                (e.currentTarget.parentElement
                                  ?.parentElement as HTMLElement) || null;
                              const rect = container?.getBoundingClientRect();
                              if (rect) {
                                const widthPct = Math.max(
                                  10,
                                  Math.min(
                                    95,
                                    ((e.currentTarget as HTMLElement)
                                      .offsetWidth /
                                      rect.width) *
                                      100
                                  )
                                );
                                setTextBoxes((prev) => {
                                  const next = [...prev];
                                  next[idx] = {
                                    ...(next[idx] || {
                                      x: 50,
                                      y: 50,
                                      widthPct: 85,
                                    }),
                                    widthPct,
                                  };
                                  return next;
                                });
                              }
                              setEditingSlide(null);
                            }}
                            className="w-full min-h-[3rem] bg-white/10 backdrop-blur-sm border border-white/30 rounded-md px-3 py-2 text-white text-center font-extrabold leading-tight tracking-tight text-[18px] outline-none focus:outline-none overflow-visible select-text"
                            style={{
                              WebkitTextStroke: "3px #000",
                              WebkitTextFillColor: "#fff",
                              paintOrder: "stroke fill",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {(() => {
                              const seed =
                                editingValue || "Click to enter text...";
                              if (!seededRef.current && editingRef.current) {
                                editingRef.current.innerText = seed;
                                seededRef.current = true;
                                const range = document.createRange();
                                range.selectNodeContents(editingRef.current);
                                range.collapse(false);
                                const sel = window.getSelection();
                                sel?.removeAllRanges();
                                sel?.addRange(range);
                              }
                              return null;
                            })()}
                          </div>
                          {/* Horizontal resize handles */}
                          <div
                            className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-white rounded cursor-ew-resize"
                            title="Resize"
                            onMouseDown={(e) => {
                              const container =
                                (e.currentTarget.parentElement
                                  ?.parentElement as HTMLElement) || undefined;
                              const rect = container?.getBoundingClientRect();
                              if (!rect) return;
                              setDragMode("resize-l");
                              const boxEl =
                                editingRef.current as HTMLElement | null;
                              const boxRect = boxEl?.getBoundingClientRect();
                              dragStart.current = {
                                x: e.clientX,
                                y: e.clientY,
                                slideIdx: idx,
                                box: textBoxes[idx] || {
                                  x: 50,
                                  y: 50,
                                  widthPct: 85,
                                },
                                rect,
                                boxPxW: boxRect?.width,
                                boxPxH: boxRect?.height,
                              };
                            }}
                          />
                          <div
                            className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-white rounded cursor-ew-resize"
                            title="Resize"
                            onMouseDown={(e) => {
                              const container =
                                (e.currentTarget.parentElement
                                  ?.parentElement as HTMLElement) || undefined;
                              const rect = container?.getBoundingClientRect();
                              if (!rect) return;
                              setDragMode("resize-r");
                              const boxEl =
                                editingRef.current as HTMLElement | null;
                              const boxRect = boxEl?.getBoundingClientRect();
                              dragStart.current = {
                                x: e.clientX,
                                y: e.clientY,
                                slideIdx: idx,
                                box: textBoxes[idx] || {
                                  x: 50,
                                  y: 50,
                                  widthPct: 85,
                                },
                                rect,
                                boxPxW: boxRect?.width,
                                boxPxH: boxRect?.height,
                              };
                            }}
                          />
                        </div>
                      ) : (
                        previewTexts[idx] && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSlide(idx);
                              setEditingOriginal(previewTexts[idx] || "");
                              setEditingValue(previewTexts[idx] || "");
                            }}
                            className="absolute p-3 text-left"
                            style={{
                              left: `${textBoxes[idx]?.x ?? 50}%`,
                              top: `${textBoxes[idx]?.y ?? 50}%`,
                              width: `${textBoxes[idx]?.widthPct ?? 85}%`,
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            <p
                              className="text-center font-extrabold leading-tight tracking-tight text-[18px]"
                              style={{
                                color: "#ffffff",
                                WebkitTextFillColor: "#ffffff",
                                WebkitTextStroke: "3px #000000",
                                paintOrder: "stroke fill",
                                textShadow: "none",
                              }}
                            >
                              {previewTexts[idx]}
                            </p>
                          </button>
                        )
                      )}
                    </div>

                    {idx === currentSlide && (
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow border border-white/10"
                          aria-label="Change image"
                          title="Change image"
                          onClick={() => {
                            setImagePickerForSlide(idx);
                            setIsImagesModalOpen(true);
                          }}
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
                        </button>
                        <button
                          className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow border border-white/10"
                          aria-label="Edit text"
                          title="Edit text"
                          onClick={() => {
                            setEditingSlide(idx);
                            setEditingOriginal(previewTexts[idx] || "");
                            setEditingValue(previewTexts[idx] || "");
                            seededRef.current = false;
                          }}
                          disabled={editingSlide !== null}
                        >
                          <Type className="w-4 h-4" />
                        </button>
                        <div
                          className="relative"
                          ref={idx === openDurationFor ? durationMenuRef : null}
                        >
                          <button
                            className="w-10 h-10 rounded-full bg-white text-black text-xs font-semibold flex items-center justify-center shadow border border-white/10"
                            onClick={(e) => {
                              const btn = e.currentTarget as HTMLElement;
                              const rect = btn.getBoundingClientRect();
                              setDurationMenuPos({
                                top: rect.bottom + 8,
                                left: rect.left + rect.width / 2,
                              });
                              setOpenDurationFor(
                                openDurationFor === idx ? null : idx
                              );
                            }}
                            aria-haspopup="menu"
                            aria-expanded={openDurationFor === idx}
                            title="Slide duration"
                          >
                            {durations[idx] ?? 2}s
                          </button>
                          {openDurationFor === idx &&
                            durationMenuPos &&
                            createPortal(
                              <div
                                ref={durationMenuPortalRef}
                                className="fixed z-50 w-32 bg-white text-black rounded-md shadow-lg border border-black/10"
                                role="menu"
                                style={{
                                  top: `${durationMenuPos.top}px`,
                                  left: `${durationMenuPos.left - 64}px`,
                                }}
                              >
                                {[2, 3, 4, 5, 6].map((sec) => (
                                  <button
                                    key={sec}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-black/5 ${
                                      (durations[idx] ?? 2) === sec
                                        ? "bg-black/5"
                                        : ""
                                    }`}
                                    onClick={() => {
                                      setDurations((prev) => {
                                        const next = [
                                          ...(prev.length
                                            ? prev
                                            : new Array(
                                                previewImages.length
                                              ).fill(2)),
                                        ];
                                        next[idx] = sec;
                                        return next;
                                      });
                                      setOpenDurationFor(null);
                                      setDurationMenuPos(null);
                                    }}
                                    role="menuitem"
                                  >
                                    {sec}s
                                  </button>
                                ))}
                              </div>,
                              document.body
                            )}
                        </div>
                        <div
                          className="relative"
                          ref={idx === openAspectFor ? aspectMenuRef : null}
                        >
                          <button
                            className="w-10 h-10 rounded-full bg-white text-black text-xs font-semibold flex items-center justify-center shadow border border-white/10"
                            onClick={(e) => {
                              const btn = e.currentTarget as HTMLElement;
                              const rect = btn.getBoundingClientRect();
                              setAspectMenuPos({
                                top: rect.bottom + 8,
                                left: rect.left + rect.width / 2,
                              });
                              setOpenAspectFor(
                                openAspectFor === idx ? null : idx
                              );
                            }}
                            aria-haspopup="menu"
                            aria-expanded={openAspectFor === idx}
                            title="Aspect ratio"
                          >
                            {aspect}
                          </button>
                          {openAspectFor === idx &&
                            aspectMenuPos &&
                            createPortal(
                              <div
                                ref={aspectMenuPortalRef}
                                className="fixed z-50 w-36 bg-white text-black rounded-md shadow-lg border border-black/10"
                                role="menu"
                                style={{
                                  top: `${aspectMenuPos.top}px`,
                                  left: `${aspectMenuPos.left - 72}px`,
                                }}
                              >
                                {["1:1", "4:5", "3:4", "9:16"].map((opt) => (
                                  <button
                                    key={opt}
                                    className={`w-full text-left px-3 py-2 text-sm hover:bg-black/5 ${
                                      aspect === opt ? "bg-black/5" : ""
                                    }`}
                                    onClick={() => {
                                      setAspect(opt as any);
                                      setOpenAspectFor(null);
                                      setAspectMenuPos(null);
                                    }}
                                    role="menuitem"
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>,
                              document.body
                            )}
                        </div>
                        <button
                          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow border border-white/10"
                          aria-label="Delete slide"
                          title="Delete slide"
                          onClick={() => deleteSlideAt(idx)}
                        >
                          <svg
                            className="w-4 h-4 text-red-500"
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
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {previewImages.length > 0 && (
            <div className="flex items-center justify-center gap-3 -mt-2">
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/5"
                onClick={() =>
                  setCurrentSlide(
                    (i) => (i - 1 + previewImages.length) % previewImages.length
                  )
                }
              >
                ‹
              </Button>
              <span className="text-xs text-white/60">
                {currentSlide + 1} / {previewImages.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/5"
                onClick={() =>
                  setCurrentSlide((i) => (i + 1) % previewImages.length)
                }
              >
                ›
              </Button>
            </div>
          )}

          {/* Controls below arrows removed; controls render under active slide above */}

          {/* Thumbnail Strip (draggable to reorder) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {previewImages.length === 0 ? (
              <>
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
              </>
            ) : (
              <>
                {previewImages.map((src, idx) => (
                  <div
                    key={idx}
                    role="button"
                    tabIndex={0}
                    title="Drag to reorder"
                    className={`relative flex-shrink-0 w-12 h-12 rounded overflow-hidden border ${
                      idx === currentSlide
                        ? "border-white ring-1 ring-white"
                        : "border-white/10"
                    } bg-white/5 ${
                      isDragging ? "cursor-grabbing" : "cursor-move"
                    } ${dragFromRef.current === idx ? "opacity-50" : ""} ${
                      dragOverIndex === idx
                        ? "outline outline-2 outline-white"
                        : ""
                    }`}
                    draggable
                    onClick={() => setCurrentSlide(idx)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        setCurrentSlide(idx);
                    }}
                    onDragStart={() => {
                      dragFromRef.current = idx;
                      setIsDragging(true);
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverIndex(idx);
                    }}
                    onDragLeave={() => {
                      setDragOverIndex((v) => (v === idx ? null : v));
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = dragFromRef.current;
                      dragFromRef.current = null;
                      setIsDragging(false);
                      setDragOverIndex(null);
                      if (from == null || from === idx) return;
                      setPreviewImages((prev) => moveItem(prev, from, idx));
                      setPreviewTexts((prev) => moveItem(prev, from, idx));
                      setDurations((prev) => moveItem(prev, from, idx));
                      setCurrentSlide(idx);
                    }}
                    onDragEnd={() => {
                      dragFromRef.current = null;
                      setIsDragging(false);
                      setDragOverIndex(null);
                    }}
                  >
                    {/* drop target indicator */}
                    {dragOverIndex === idx && (
                      <div className="absolute left-0 top-0 h-full w-[3px] bg-white/80" />
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt="thumb"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 w-12 h-12 border-white/20 text-white hover:bg-white/5"
                >
                  +
                </Button>
              </>
            )}
          </div>

          {/* Export Button */}
          <Button
            className="w-full bg-white hover:bg-gray-200 text-black font-semibold py-4 text-lg"
            onClick={async () => {
              try {
                if (previewImages.length === 0) return;
                setIsExporting(true);
                const supabase = createSupabaseBrowserClient();
                const total = (durations || []).reduce(
                  (a, b) => a + (b || 0),
                  0
                );
                // Compose text over images and upload
                const composedUrls: string[] = [];
                for (let i = 0; i < previewImages.length; i++) {
                  const url = await compositeAndUploadSlide(
                    previewImages[i],
                    previewTexts[i] || "",
                    textBoxes[i] || { x: 50, y: 50, widthPct: 85 },
                    aspect,
                    i
                  );
                  composedUrls.push(url);
                }

                const payload = {
                  title: `Slideshow ${new Date().toLocaleDateString()}`,
                  prompt,
                  aspect,
                  num_slides: previewImages.length,
                  total_duration_sec: total,
                  thumbnail_url: composedUrls[0] || previewImages[0] || null,
                  data: {
                    images: composedUrls,
                    texts: previewTexts,
                    textBoxes,
                    durations,
                    aspect,
                    prompt,
                  },
                } as const;
                const { error } = await supabase
                  .from("exported_slideshows")
                  .insert(payload);
                if (error) throw error;
                await loadExports();
              } catch (err) {
                console.error("Export failed:", err);
              } finally {
                setIsExporting(false);
              }
            }}
            disabled={isExporting || previewImages.length === 0}
          >
            {isExporting ? "Exporting…" : "Export"}
          </Button>
        </Card>
      </div>

      {/* Bottom Section - Exported & Drafts */}
      <div className="mt-12 space-y-6">
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-white/10 flex-wrap justify-between">
          <button className="pb-3 border-b-2 border-white font-semibold">
            {`Exported Slideshows (${exportedSlideshows.length})`}
          </button>
          <div className="ml-auto flex items-center gap-2 pb-3">
            {(() => {
              const totalPages = Math.max(
                1,
                Math.ceil(exportedSlideshows.length / pageSize)
              );
              return (
                <>
                  <span className="text-sm text-white/50">{`Page ${Math.min(
                    page,
                    totalPages
                  )} of ${totalPages}`}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/5"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    ‹
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/5"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    ›
                  </Button>
                </>
              );
            })()}
          </div>
        </div>

        {/* Grid of Slideshows (from Supabase) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(() => {
            const start = (page - 1) * pageSize;
            const end = start + pageSize;
            return exportedSlideshows.slice(start, end);
          })().map((ex) => (
            <Card
              key={ex.id}
              className="bg-white/5 border border-white/10 p-3 space-y-3 hover:bg-white/10 transition-colors cursor-pointer"
            >
              {/* Per-card carousel */}
              {(() => {
                const slides: string[] = Array.isArray(ex?.data?.images)
                  ? ex.data.images.filter(Boolean)
                  : [];
                const total = slides.length || 1;
                const idxKey = String(ex.id);
                const current = Math.min(
                  cardSlideIndex[idxKey] ?? 0,
                  Math.max(0, total - 1)
                );
                const go = (delta: number) => {
                  setCardSlideIndex((prev) => {
                    const next = { ...prev } as Record<string, number>;
                    const n = (((current + delta) % total) + total) % total;
                    next[idxKey] = n;
                    return next;
                  });
                };

                const activeSrc =
                  slides[current] || ex.thumbnail_url || slides[0];
                const aspectClass =
                  (ex.aspect || "9:16") === "1:1"
                    ? "aspect-square"
                    : (ex.aspect || "9:16") === "4:5"
                    ? "aspect-[4/5]"
                    : (ex.aspect || "9:16") === "3:4"
                    ? "aspect-[3/4]"
                    : "aspect-[9/16]";

                return (
                  <div
                    className={`${aspectClass} bg-white/5 rounded-md overflow-hidden relative`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {activeSrc ? (
                      <img
                        src={activeSrc}
                        alt={ex.title || "thumbnail"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5" />
                    )}

                    {/* Arrows */}
                    {total > 1 && (
                      <>
                        <button
                          aria-label="Previous slide"
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                          onClick={(e) => {
                            e.stopPropagation();
                            go(-1);
                          }}
                        >
                          ‹
                        </button>
                        <button
                          aria-label="Next slide"
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
                          onClick={(e) => {
                            e.stopPropagation();
                            go(1);
                          }}
                        >
                          ›
                        </button>

                        {/* Dots */}
                        <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
                          {Array.from({ length: total }).map((_, i) => (
                            <span
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                i === current ? "bg-white" : "bg-white/40"
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
              <div className="space-y-1">
                <p className="text-sm font-medium text-white truncate">
                  {ex.title || "Slideshow"}
                </p>
                <p className="text-xs text-white/50">
                  {ex.created_at
                    ? new Date(ex.created_at).toLocaleString()
                    : ""}
                </p>
                <div className="pt-1">
                  <button
                    className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareModal({ open: true, slideshow: ex });
                    }}
                    title="Publish to TikTok"
                  >
                    {/* TikTok icon */}
                    <svg
                      viewBox="0 0 48 48"
                      className="w-4 h-4"
                      fill="currentColor"
                    >
                      <path d="M31.5 9.5c2.2 2.6 5 4.2 8.5 4.6v6.3c-3.5-.1-6.6-1.1-9.3-3v10.6c0 6.6-5.4 11.6-12 10.9-5.6-.6-9.7-5.7-9.1-11.3.6-5.6 5.7-9.7 11.3-9.1v6.4c-1.9-.5-3.8.8-4.1 2.7-.4 2.1 1.4 4 3.5 4 2 .1 3.7-1.5 3.7-3.5V6h7.5v3.5z" />
                    </svg>
                    <span>Post to TikTok</span>
                  </button>
                </div>
              </div>
            </Card>
          ))}

          {/* Empty State */}
          {exportedSlideshows.length === 0 && (
            <Card className="bg-white/5 border border-white/10 border-dashed p-3 flex items-center justify-center aspect-[9/16] hover:bg-white/10 transition-colors">
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
                <p className="text-xs text-white/50">No slideshows yet</p>
              </div>
            </Card>
          )}
        </div>

        {/* Bottom pagination removed – top-right controls are sufficient */}
      </div>
      {/* TikTok share modal */}
      {shareModal.open && shareModal.slideshow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-2xl bg-black border border-white/20 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-semibold">
                <svg
                  viewBox="0 0 48 48"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                  <path d="M31.5 9.5c2.2 2.6 5 4.2 8.5 4.6v6.3c-3.5-.1-6.6-1.1-9.3-3v10.6c0 6.6-5.4 11.6-12 10.9-5.6-.6-9.7-5.7-9.1-11.3.6-5.6 5.7-9.7 11.3-9.1v6.4c-1.9-.5-3.8.8-4.1 2.7-.4 2.1 1.4 4 3.5 4 2 .1 3.7-1.5 3.7-3.5V6h7.5v3.5z" />
                </svg>
                Publish to TikTok
              </div>
              <button
                className="text-white/70 hover:text-white"
                onClick={() => setShareModal({ open: false, slideshow: null })}
              >
                ✕
              </button>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-[260px,1fr] gap-4">
              {/* Preview carousel */}
              <div className="bg-white/5 rounded-md p-3">
                <div className="aspect-[9/16] bg-black/30 rounded overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      shareModal.slideshow.thumbnail_url ||
                      shareModal.slideshow.data?.images?.[0]
                    }
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {Array.isArray(shareModal.slideshow?.data?.images) &&
                    shareModal.slideshow.data.images.map(
                      (_: any, i: number) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-white/50"
                        />
                      )
                    )}
                </div>
              </div>
              {/* Form */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-white/60">
                    Select account
                  </label>
                  <div className="mt-1 px-3 py-2 rounded bg-white/5 border border-white/10 text-sm">
                    @connected_account
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/80">
                    Publish Immediately
                  </span>
                  <button
                    className="w-10 h-6 rounded-full bg-white/20"
                    aria-pressed="true"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Title</label>
                  <input
                    className="mt-1 w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-sm"
                    placeholder="Add a title…"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60">Description</label>
                  <textarea
                    className="mt-1 w-full px-3 py-2 rounded bg-white/5 border border-white/10 text-sm"
                    rows={3}
                    placeholder="Add a description…"
                  />
                </div>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/5"
                    onClick={() =>
                      setShareModal({ open: false, slideshow: null })
                    }
                  >
                    Close
                  </Button>
                  <Button className="bg-white text-black hover:bg-gray-200">
                    Publish to TikTok
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Image Collections Modal */}
      {isImagesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-6xl max-h-[90vh] mx-4 bg-black border border-white/20 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold">Select Image Collection</h2>
              <button
                onClick={() => setIsImagesModalOpen(false)}
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
            <div className="p-6 border-b border-white/10">
              <input
                value={imageSearch}
                onChange={(e) => setImageSearch(e.target.value)}
                placeholder="Search collections..."
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <div className="p-6 overflow-y-auto max-h:[calc(90vh-200px)] max-h-[calc(90vh-200px)]">
              {modalImages.length > 0 || isModalImagesLoading ? (
                <>
                  {selectedCollection && (
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-white/70 text-sm">
                        {selectedCollection} · Showing{" "}
                        {Math.min(27, modalImages.length)} images
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/20 text-white hover:bg-white/5"
                        onClick={() => {
                          setModalImages([]);
                          setSelectedCollection(null);
                        }}
                      >
                        Back to Collections
                      </Button>
                    </div>
                  )}
                  {isModalImagesLoading ? (
                    <div className="text-white/60 py-20 text-center">
                      Loading images…
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-6 xl:grid-cols-9 gap-2">
                      {modalImages.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (imagePickerForSlide != null) {
                              setPreviewImages((prev) => {
                                const next = [...prev];
                                next[imagePickerForSlide] = img;
                                return next;
                              });
                              setIsImagesModalOpen(false);
                              setImagePickerForSlide(null);
                              setModalImages([]);
                              setSelectedCollection(null);
                            }
                          }}
                          className="aspect-square rounded overflow-hidden bg-white/5 border border-white/10 hover:border-white/40 hover:bg-white/10"
                          title="Use this image"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt="choice"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCollections.map((name, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedCollection(name);
                        if (imagePickerForSlide != null) {
                          // If opened from a slide, immediately load first 27 images to pick from
                          loadCollectionImages(name);
                        }
                      }}
                      className={`text-left bg-white/5 border rounded-md overflow-hidden hover:bg-white/10 transition-colors ${
                        selectedCollection === name
                          ? "border-white"
                          : "border-white/10"
                      }`}
                    >
                      <div className="grid grid-cols-8 gap-[2px] p-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            className="aspect-square bg-gradient-to-br from-white/10 to-white/5 rounded"
                          />
                        ))}
                      </div>
                      <div className="px-3 py-2 text-sm text-white/80 truncate">
                        {name}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Footer buttons only for selecting collection to apply globally */}
            {imagePickerForSlide == null && (
              <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
                <Button
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/5"
                  onClick={() => setIsImagesModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-white text-black hover:bg-gray-200"
                  disabled={!selectedCollection}
                  onClick={() => {
                    setAppliedCollection(selectedCollection);
                    setIsImagesModalOpen(false);
                  }}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
