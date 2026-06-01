"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, LoaderCircle, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { getFileStoreMeta, getFileStoreDataUrl } from "@/lib/fileStore";
import {
  adaptImageResult,
  adaptAudioResult,
  adaptVideoResult,
  type ImageAnalysisResponse,
  type AudioAnalysisResponse,
  type VideoAnalysisResponse,
} from "@/lib/aggregator";

const stepTimings = [800, 2400, 2700, 1300, 600, 300, 3200, 2000];

function getPipelineSteps(mediaType: string) {
  if (mediaType === "image") {
    return [
      { id: "intake",   label: "Privacy filter",           model: "Client-side intake" },
      { id: "siglip",  label: "SigLIP2 deepfake scan",     model: "prithivMLmods/deepfake-detector-v1" },
      { id: "sdxl",    label: "SDXL generation detector",  model: "Organika/sdxl-detector" },
      { id: "aiimg",   label: "AI image fingerprinting",   model: "haywoodsloan/ai-image-detector" },
      { id: "verdict", label: "Weighted verdict",          model: "Aggregator" },
      { id: "cert",    label: "Certificate preparation",   model: "Report engine" },
    ];
  }
  if (mediaType === "audio") {
    return [
      { id: "intake",    label: "Privacy filter",           model: "Client-side intake" },
      { id: "health",   label: "Colab health check",        model: "ngrok endpoint" },
      { id: "deepfake", label: "Audio deepfake detection",  model: "mo-thecreator/Deepfake-audio-detection" },
      { id: "scam",     label: "Scam & transcription scan",  model: "gemini-2.5-flash" },
      { id: "verdict",  label: "Verdict synthesis",         model: "Aggregator" },
      { id: "cert",     label: "Certificate preparation",   model: "Report engine" },
    ];
  }
  // video
  return [
    { id: "intake",  label: "Privacy filter",            model: "Client-side intake" },
    { id: "upload", label: "Upload to Gemini Files API", model: "Google Files API" },
    { id: "proc",   label: "Video frame processing",     model: "Gemini ingestion" },
    { id: "gemini", label: "Forensic video analysis",    model: "gemini-2.5-flash" },
    { id: "scam",   label: "Scam & fraud scanning",      model: "gemini-2.5-flash" },
    { id: "verdict",label: "Verdict synthesis",          model: "Aggregator" },
    { id: "cert",   label: "Certificate preparation",    model: "Report engine" },
  ];
}

function CircularProgress({ pct }: { pct: number }) {
  const radius = 72;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg viewBox="0 0 180 180" aria-hidden="true">
      <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--line-2)" strokeWidth="8" />
      <circle
        cx="90" cy="90" r={radius}
        fill="none"
        stroke="var(--red)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 90 90)"
        style={{ transition: "stroke-dashoffset 600ms ease" }}
      />
    </svg>
  );
}

export default function ProcessingPage() {
  const router = useRouter();
  const apiCalledRef = useRef(false);

  const [hasMounted, setHasMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [fileInfo, setFileInfo] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState("");

  useEffect(() => {
    setHasMounted(true);
    const info = getFileStoreMeta();
    if (!info) {
      router.push("/upload");
    } else {
      setFileInfo(info);
      setAnalysisId(`VS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);
    }
  }, [router]);

  useEffect(() => {
    if (!hasMounted || !fileInfo || !analysisId || apiCalledRef.current) return;
    apiCalledRef.current = true;

    const steps = getPipelineSteps(fileInfo.mediaType);
    let local = 0;

    const advance = () => {
      if (local >= steps.length) return;
      setCurrentStep(local);
      const delay = stepTimings[local] ?? 1000;
      setTimeout(() => {
        setCompletedSteps((p) => new Set([...p, local]));
        setProgress(Math.round(((local + 1) / steps.length) * 100));
        local += 1;
        advance();
      }, delay);
    };

    advance();

    // ── Retrieve the file blob from the in-memory store ─────────────────
    const meta = { analysisId, fileName: fileInfo.name };
    const t0   = Date.now();
    const total = stepTimings.slice(0, steps.length).reduce((a, b) => a + b, 0);

    async function runAnalysis() {
      if (!fileInfo) { router.push("/upload"); return; }
      const dataUrl = getFileStoreDataUrl();
      if (!dataUrl) { router.push("/upload"); return; }

      const fetchedBlob = await fetch(dataUrl).then(r => r.blob());
      const file = new File([fetchedBlob], fileInfo.name, { type: fileInfo.type });

      const formData = new FormData();
      formData.append("file", file);

      const mediaType = fileInfo.mediaType as "image" | "audio" | "video";
      const endpoint  = `/api/analyze/${mediaType}`;

      try {
        const res  = await fetch(endpoint, { method: "POST", body: formData });
        const data = await res.json();

        let result;
        if (mediaType === "image") {
          result = adaptImageResult(data as ImageAnalysisResponse, meta);
        } else if (mediaType === "audio") {
          result = adaptAudioResult(data as AudioAnalysisResponse, meta);
        } else {
          result = adaptVideoResult(data as VideoAnalysisResponse, meta);
        }

        if (result.error) {
          sessionStorage.setItem("analysisResult", JSON.stringify(result));
          setTimeout(() => router.push("/upload"), 500);
          return;
        }

        sessionStorage.setItem("analysisResult", JSON.stringify(result));
        const remaining = Math.max(500, total - (Date.now() - t0));
        setTimeout(() => router.push("/results"), remaining);
      } catch (err) {
        console.error("Analysis error:", err);
        sessionStorage.setItem(
          "analysisResult",
          JSON.stringify({ error: "An unexpected error occurred during analysis.", analysisId, fileName: fileInfo?.name, fileType: fileInfo?.mediaType }),
        );
        setTimeout(() => router.push("/upload"), 1500);
      }
    }

    runAnalysis();
  }, [hasMounted, analysisId, fileInfo, router]);

  if (!hasMounted || !fileInfo) {
    return null;
  }

  const mediaLabel = fileInfo.mediaType === "audio" ? "audio" : fileInfo.mediaType === "image" ? "image" : "video";
  const pipelineSteps = getPipelineSteps(fileInfo.mediaType);

  return (
    <>
      <Navbar />
      <div className="page-content" style={{ height: "calc(100vh - var(--header-h))", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <main className="page-container" style={{ flex: 1, padding: "20px 0 28px", display: "flex", flexDirection: "column", gap: 16, justifyContent: "center", minHeight: 0 }}>

          <header className="page-intro fade-in" style={{ marginBottom: 0 }}>
            <span className="eyebrow" style={{ fontSize: "0.68rem" }}>Processing pipeline</span>
            <h1 className="page-title" style={{ fontSize: "1.75rem", marginTop: 4, lineHeight: 1.2 }}>
              Inspecting {fileInfo ? `your ${mediaLabel}` : "the file"}.
            </h1>
          </header>

          <section className="workspace-grid" style={{ minHeight: 0, flex: 1, display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 20, alignItems: "stretch" }}>
            {/* Pipeline */}
            <div className="surface" style={{ padding: 20, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 10,
                  flexShrink: 0
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Pipeline</div>
                <span className="pill pill-accent" style={{ minHeight: 22, fontSize: "0.72rem", paddingInline: 8 }}>{progress}%</span>
              </div>

              <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
                {pipelineSteps.map((step, i) => {
                  const isDone = completedSteps.has(i);
                  const isCurrent = currentStep === i && !isDone;
                  return (
                    <div
                      key={step.id}
                      className={`stage-row${isDone ? " is-done" : isCurrent ? " is-current" : ""}`}
                      style={{ padding: "10px 0" }}
                    >
                      <span className="stage-status" style={{ width: 24, height: 24 }}>
                        {isDone ? <CheckCircle2 size={12} color="var(--green)" /> :
                          isCurrent ? <LoaderCircle size={12} color="var(--red)" className="spin" /> :
                            <Clock3 size={12} color="var(--text-3)" />}
                      </span>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: "0.85rem" }}>{step.label}</div>
                        <div className="note mono" style={{ fontSize: "0.72rem", marginTop: 1 }}>{step.model}</div>
                      </div>
                      <div className="mono" style={{ color: "var(--text-3)", fontSize: "0.72rem" }}>
                        {isDone ? "done" : isCurrent ? "running" : "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="surface-stack" style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
              <div className="surface" style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 0 }}>
                <div style={{ textAlign: "center" }} className="stack-sm">
                  <div className="dial" style={{ width: 140, height: 140 }}>
                    <CircularProgress pct={progress} />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        className="mono"
                        style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "-0.04em", lineHeight: 1 }}
                      >
                        {progress}%
                      </div>
                      <div className="note" style={{ fontSize: "0.7rem", marginTop: 2 }}>complete</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {pipelineSteps[Math.min(currentStep, pipelineSteps.length - 1)]?.label || "Preparing"}
                    </div>
                    <p className="note" style={{ margin: "2px 0 0", fontSize: "0.8rem" }}>
                      {completedSteps.size} / {pipelineSteps.length} stages
                    </p>
                  </div>
                </div>
              </div>

              <div className="surface" style={{ padding: 16, flexShrink: 0 }}>
                <div className="data-list">
                  <div className="data-row" style={{ padding: "6px 0" }}>
                    <span className="label" style={{ fontSize: "0.8rem" }}>File</span>
                    <span className="value" style={{ fontSize: "0.8rem", fontWeight: 500 }}>{fileInfo?.name || "—"}</span>
                  </div>
                  <div className="data-row" style={{ padding: "6px 0" }}>
                    <span className="label" style={{ fontSize: "0.8rem" }}>Mode</span>
                    <span className="value" style={{ textTransform: "capitalize", fontWeight: 500, fontSize: "0.8rem" }}>{mediaLabel}</span>
                  </div>
                  <div className="data-row" style={{ padding: "6px 0" }}>
                    <span className="label" style={{ fontSize: "0.8rem" }}>ID</span>
                    <span className="value mono" style={{ fontSize: "0.72rem", fontWeight: 500 }}>{analysisId}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 14px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={14} color="var(--text-3)" style={{ flexShrink: 0 }} />
                <p className="note" style={{ margin: 0, fontSize: "0.8rem" }}>
                  Media is cleared after submission.
                </p>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}