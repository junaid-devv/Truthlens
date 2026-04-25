"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, LoaderCircle, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { clearFileStore, getFileStoreDataUrl, getFileStoreMeta } from "@/lib/fileStore";

const stepTimings = [800, 2400, 2700, 1300, 600, 300, 3200, 2000];

function getPipelineSteps(mediaType: string) {
  return [
    { id: "privacy", label: "Privacy filter", model: "Client-side intake" },
    ...(mediaType === "image"
      ? [{ id: "image-primary", label: "Image deepfake detection", model: "ViT verifier" }]
      : [{ id: "audio", label: "Audio deepfake detection", model: "XLS-R detector" }]),
    { id: "consistency", label: mediaType === "image" ? "Texture verification" : "Emotion consistency", model: "Behavioral review" },
    { id: "context", label: "Context classification", model: "BART-MNLI" },
    { id: "report", label: "Evidence synthesis", model: "Gemini Flash" },
    { id: "certificate", label: "Certificate preparation", model: "Report engine" },
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
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [fileInfo] = useState(() => getFileStoreMeta());
  const [analysisId] = useState(
    () => `VS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
  );

  useEffect(() => {
    if (!fileInfo) router.push("/upload");
  }, [fileInfo, router]);

  useEffect(() => {
    if (!fileInfo || apiCalledRef.current) return;
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

    const fileData = getFileStoreDataUrl();
    if (!fileData) { router.push("/upload"); return; }

    const t0 = Date.now();
    const total = stepTimings.reduce((a, b) => a + b, 0);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileData, fileName: fileInfo.name, fileType: fileInfo.mediaType, mimeType: fileInfo.type }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
           sessionStorage.setItem("analysisResult", JSON.stringify({ error: data.error, analysisId, fileName: fileInfo.name, fileType: fileInfo.mediaType }));
           setTimeout(() => router.push("/upload"), 500);
           return;
        }
        sessionStorage.setItem("analysisResult", JSON.stringify({ ...data, analysisId, fileName: fileInfo.name, fileType: fileInfo.mediaType }));
        const remaining = Math.max(500, total - (Date.now() - t0));
        setTimeout(() => router.push("/results"), remaining);
      })
      .catch((err) => {
        console.error("Analysis error:", err);
        sessionStorage.setItem("analysisResult", JSON.stringify({ error: "An unexpected error occurred during analysis.", analysisId, fileName: fileInfo.name, fileType: fileInfo.mediaType }));
        setTimeout(() => router.push("/upload"), 1500);
      });
  }, [analysisId, fileInfo, router]);

  const mediaLabel = fileInfo?.mediaType === "audio" ? "audio" : fileInfo?.mediaType === "image" ? "image" : "video";
  const pipelineSteps = getPipelineSteps(fileInfo?.mediaType || "audio");

  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container stack-lg">

          <header className="page-intro fade-in">
            <span className="eyebrow">Processing</span>
            <h1 className="page-title">
              Inspecting {fileInfo ? `your ${mediaLabel}` : "the file"}.
            </h1>
          </header>

          <section className="workspace-grid">
            {/* Pipeline */}
            <div className="surface" style={{ padding: 24 }}>
              <div className="stack-md">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>Pipeline</div>
                  <span className="pill pill-accent">{progress}%</span>
                </div>

                <div>
                  {pipelineSteps.map((step, i) => {
                    const isDone = completedSteps.has(i);
                    const isCurrent = currentStep === i && !isDone;
                    return (
                      <div
                        key={step.id}
                        className={`stage-row${isDone ? " is-done" : isCurrent ? " is-current" : ""}`}
                      >
                        <span className="stage-status">
                          {isDone ? <CheckCircle2 size={14} color="var(--green)" /> :
                            isCurrent ? <LoaderCircle size={14} color="var(--red)" className="spin" /> :
                              <Clock3 size={14} color="var(--text-3)" />}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{step.label}</div>
                          <div className="note mono" style={{ fontSize: "0.78rem" }}>{step.model}</div>
                        </div>
                        <div className="mono" style={{ color: "var(--text-3)", fontSize: "0.78rem" }}>
                          {isDone ? "done" : isCurrent ? "running" : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="surface-stack">
              <div className="surface" style={{ padding: 24 }}>
                <div className="stack-md" style={{ textAlign: "center" }}>
                  <div className="dial">
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
                        style={{ fontSize: "2.2rem", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1 }}
                      >
                        {progress}%
                      </div>
                      <div className="note" style={{ fontSize: "0.75rem", marginTop: 4 }}>complete</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                      {pipelineSteps[Math.min(currentStep, pipelineSteps.length - 1)]?.label || "Preparing"}
                    </div>
                    <p className="note" style={{ margin: "6px 0 0", fontSize: "0.83rem" }}>
                      {completedSteps.size} / {pipelineSteps.length} stages
                    </p>
                  </div>
                </div>
              </div>

              <div className="surface-muted" style={{ padding: 20 }}>
                <div className="data-list">
                  <div className="data-row">
                    <span className="label">File</span>
                    <span className="value" style={{ fontSize: "0.82rem" }}>{fileInfo?.name || "—"}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Mode</span>
                    <span className="value" style={{ textTransform: "capitalize" }}>{mediaLabel}</span>
                  </div>
                  <div className="data-row">
                    <span className="label">ID</span>
                    <span className="value mono" style={{ fontSize: "0.75rem" }}>{analysisId}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "14px 16px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--bg-2)",
                }}
              >
                <ShieldCheck size={16} color="var(--text-3)" style={{ marginTop: 2, flexShrink: 0 }} />
                <p className="note" style={{ margin: 0, fontSize: "0.82rem" }}>
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