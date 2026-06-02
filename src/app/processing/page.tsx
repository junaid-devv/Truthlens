"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, LoaderCircle, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  getFileStoreMeta,
  getFileStoreDataUrl,
  type PendingFileMeta,
} from "@/lib/fileStore";
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
      { id: "intake",   label: "Privacy filter",              model: "Client-side intake" },
      { id: "health",   label: "Colab health check",           model: "ngrok endpoint" },
      { id: "aiimg",    label: "AI image generation scan",     model: "xRayon/convnext-ai-images-detector" },
      { id: "forgery",  label: "Face forgery detection",       model: "yermandy/deepfake-detection" },
      { id: "report",   label: "Forensic report synthesis",    model: "gemini-2.5-flash" },
      { id: "cert",     label: "Certificate preparation",      model: "Report engine" },
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

export default function ProcessingPage() {
  const router = useRouter();
  const apiCalledRef = useRef(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [fileInfo] = useState<PendingFileMeta | null>(() =>
    typeof window === "undefined" ? null : getFileStoreMeta(),
  );
  const [analysisId] = useState(() =>
    `VS-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`,
  );

  useEffect(() => {
    if (!fileInfo) {
      router.push("/upload");
    }
  }, [fileInfo, router]);

  useEffect(() => {
    if (!fileInfo || !analysisId || apiCalledRef.current) return;
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
          setTimeout(() => router.push("/results"), 500);
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
        setTimeout(() => router.push("/results"), 500);
      }
    }

    runAnalysis();
  }, [analysisId, fileInfo, router]);

  if (!fileInfo) {
    return null;
  }

  const mediaLabel = fileInfo.mediaType === "audio" ? "audio" : fileInfo.mediaType === "image" ? "image" : "video";
  const pipelineSteps = getPipelineSteps(fileInfo.mediaType);

  return (
    <>
      <Navbar />
      <div className="page-content viewport-page">
        <main className="page-container viewport-container stack-sm">

          <header className="page-intro fade-in" style={{ marginBottom: 0, flexShrink: 0 }}>
            <span className="eyebrow" style={{ fontSize: "0.68rem" }}>Forensic pipeline</span>
            <h1 className="page-title" style={{ fontSize: "1.45rem", marginTop: 4, lineHeight: 1.2 }}>
              Processing {fileInfo ? `${mediaLabel} evidence` : "evidence"}.
            </h1>
          </header>

          <section className="workspace-grid viewport-grid">
            {/* Pipeline */}
            <div className="surface compact-surface" style={{ padding: 18, display: "flex", flexDirection: "column" }}>
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
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>Active stages</div>
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
                      style={{ padding: "8px 0" }}
                    >
                      <span className="stage-status" style={{ width: 24, height: 24 }}>
                        {isDone ? <CheckCircle2 size={12} color="var(--green)" /> :
                          isCurrent ? <LoaderCircle size={12} color="var(--red)" className="spin" /> :
                            <Clock3 size={12} color="var(--text-3)" />}
                      </span>
                      <div>
                        <div style={{ fontWeight: 650, fontSize: "0.84rem" }}>{step.label}</div>
                        <div className="note mono" style={{ fontSize: "0.68rem", marginTop: 1, overflowWrap: "anywhere" }}>{step.model}</div>
                      </div>
                      <div className="mono" style={{ color: "var(--text-3)", fontSize: "0.72rem" }}>
                        {isDone ? "done" : isCurrent ? "running" : "-"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="surface-stack" style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
              <div className="surface compact-surface" style={{ padding: 20, flex: 1, display: "flex", alignItems: "center" }}>
                <div className="processing-progress">
                  <div>
                    <div className="label">Progress</div>
                    <div className="processing-progress__value">{progress}%</div>
                    <div className="note" style={{ marginTop: 6 }}>
                      {pipelineSteps[Math.min(currentStep, pipelineSteps.length - 1)]?.label || "Preparing"}
                    </div>
                  </div>
                  <div className="processing-progress__bar" aria-label={`${progress}% complete`}>
                    <div className="processing-progress__fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span className="pill pill-accent">{completedSteps.size} / {pipelineSteps.length}</span>
                    <span className="pill">Stages</span>
                  </div>
                </div>
              </div>

              <div className="surface" style={{ padding: 14, flexShrink: 0 }}>
                <div className="data-list">
                  <div className="data-row" style={{ padding: "6px 0" }}>
                    <span className="label" style={{ fontSize: "0.8rem" }}>File</span>
                    <span className="value" style={{ fontSize: "0.78rem", fontWeight: 600, overflowWrap: "anywhere" }}>{fileInfo?.name || "-"}</span>
                  </div>
                  <div className="data-row" style={{ padding: "6px 0" }}>
                    <span className="label" style={{ fontSize: "0.8rem" }}>Mode</span>
                    <span className="value" style={{ textTransform: "capitalize", fontWeight: 500, fontSize: "0.8rem" }}>{mediaLabel}</span>
                  </div>
                  <div className="data-row" style={{ padding: "6px 0" }}>
                    <span className="label" style={{ fontSize: "0.8rem" }}>ID</span>
                    <span className="value mono" style={{ fontSize: "0.68rem", fontWeight: 600, overflowWrap: "anywhere" }}>{analysisId}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={14} color="var(--text-3)" style={{ flexShrink: 0 }} />
                <p className="note" style={{ margin: 0, fontSize: "0.8rem" }}>
                  Case media is cleared when the session ends.
                </p>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}
