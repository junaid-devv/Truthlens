"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  clearFileStore,
  getFileStoreDataUrl,
  getFileStoreMeta,
} from "@/lib/fileStore";

const stepTimings = [800, 2400, 2700, 1300, 600, 300, 3200, 2000];

function getPipelineSteps(mediaType: string) {
  return [
    {
      id: "privacy",
      label: "Privacy filter",
      time: "0.8s",
      model: "Client-side intake",
    },
    ...(mediaType === "image"
      ? [
          {
            id: "image-primary",
            label: "Image deepfake detection",
            time: "2.4s",
            model: "ViT verifier",
          },
        ]
      : [
          {
            id: "audio",
            label: "Audio deepfake detection",
            time: "3.5s",
            model: "XLS-R detector",
          },
        ]),
    {
      id: "consistency",
      label: mediaType === "image" ? "Texture verification" : "Emotion consistency",
      time: "1.2s",
      model: "Behavioral review",
    },
    {
      id: "context",
      label: "Context classification",
      time: "0.3s",
      model: "BART-MNLI",
    },
    {
      id: "report",
      label: "Evidence synthesis",
      time: "3.2s",
      model: "Gemini Flash",
    },
    {
      id: "certificate",
      label: "Certificate preparation",
      time: "Waiting",
      model: "Report engine",
    },
  ];
}

function CircularProgress({ pct }: { pct: number }) {
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg viewBox="0 0 220 220" aria-hidden="true">
      <circle
        cx="110"
        cy="110"
        r={radius}
        fill="none"
        stroke="var(--line)"
        strokeWidth="12"
      />
      <circle
        cx="110"
        cy="110"
        r={radius}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 110 110)"
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
  const [fileInfo] = useState<{
    name: string;
    type: string;
    mediaType: string;
  } | null>(() => getFileStoreMeta());
  const [analysisId] = useState(
    () =>
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
    if (!fileInfo || apiCalledRef.current) {
      return;
    }

    apiCalledRef.current = true;
    const steps = getPipelineSteps(fileInfo.mediaType);
    let localStep = 0;

    const advance = () => {
      if (localStep >= steps.length) {
        return;
      }

      setCurrentStep(localStep);
      const delay = stepTimings[localStep] ?? 1000;

      setTimeout(() => {
        setCompletedSteps((previous) => new Set([...previous, localStep]));
        setProgress(Math.round(((localStep + 1) / steps.length) * 100));
        localStep += 1;
        advance();
      }, delay);
    };

    advance();

    const fileData = getFileStoreDataUrl();
    if (!fileData) {
      router.push("/upload");
      return;
    }

    const apiStartTime = Date.now();
    const totalAnimationTime = stepTimings.reduce((sum, timing) => sum + timing, 0);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileData,
        fileName: fileInfo.name,
        fileType: fileInfo.mediaType,
        mimeType: fileInfo.type,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        sessionStorage.setItem(
          "analysisResult",
          JSON.stringify({
            ...data,
            analysisId,
            fileName: fileInfo.name,
            fileType: fileInfo.mediaType,
          }),
        );

        clearFileStore();

        const elapsed = Date.now() - apiStartTime;
        const remaining = Math.max(500, totalAnimationTime - elapsed);
        setTimeout(() => router.push("/results"), remaining);
      })
      .catch((error) => {
        console.error("Analysis error:", error);
        clearFileStore();
        sessionStorage.setItem(
          "analysisResult",
          JSON.stringify({
            error: true,
            analysisId,
            fileName: fileInfo.name,
            fileType: fileInfo.mediaType,
          }),
        );
        setTimeout(() => router.push("/upload"), 1500);
      });
  }, [analysisId, fileInfo, router]);

  const mediaLabel =
    fileInfo?.mediaType === "audio"
      ? "audio"
      : fileInfo?.mediaType === "image"
        ? "image"
        : "video";

  const pipelineSteps = getPipelineSteps(fileInfo?.mediaType || "audio");

  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container stack-lg">
          <header className="page-intro fade-in">
            <span className="eyebrow">Processing</span>
            <h1 className="page-title">
              Inspecting your {fileInfo ? mediaLabel : "file"} now.
            </h1>
            <p className="page-subtitle">
              Track live stage progress in real time.
            </p>
          </header>

          <section className="workspace-grid">
            <div className="surface" style={{ padding: 28 }}>
              <div className="stack-md">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div>
                    <div className="label">Pipeline stages</div>
                    <div style={{ marginTop: 8, fontSize: "1.2rem", fontWeight: 700 }}>
                      Execution status
                    </div>
                  </div>
                  <span className="pill pill-accent">{progress}% complete</span>
                </div>

                <div>
                  {pipelineSteps.map((step, index) => {
                    const isDone = completedSteps.has(index);
                    const isCurrent = currentStep === index && !isDone;

                    return (
                      <div
                        key={step.id}
                        className={`stage-row${
                          isDone
                            ? " is-done"
                            : isCurrent
                              ? " is-current"
                              : ""
                        }`}
                      >
                        <span className="stage-status">
                          {isDone ? (
                            <CheckCircle2 size={16} color="var(--success)" />
                          ) : isCurrent ? (
                            <LoaderCircle size={16} color="var(--accent)" className="spin" />
                          ) : (
                            <Clock3 size={16} color="var(--text-soft)" />
                          )}
                        </span>

                        <div>
                          <div style={{ fontWeight: 700 }}>{step.label}</div>
                          <div className="note" style={{ fontSize: "0.88rem" }}>
                            {step.model}
                          </div>
                        </div>

                        <div className="mono" style={{ color: "var(--text-dim)" }}>
                          {isDone ? "Done" : isCurrent ? "Running" : step.time}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="surface-stack">
              <div className="surface" style={{ padding: 28 }}>
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
                      <div className="result-score status-value">{progress}%</div>
                      <div className="label">overall progress</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontWeight: 700 }}>
                      {pipelineSteps[Math.min(currentStep, pipelineSteps.length - 1)]
                        ?.label || "Preparing"}
                    </div>
                    <p className="note" style={{ margin: "8px 0 0" }}>
                      {completedSteps.size} of {pipelineSteps.length} stages
                      complete.
                    </p>
                  </div>
                </div>
              </div>

              <div className="surface-muted" style={{ padding: 24 }}>
                <div className="stack-sm">
                  <div className="label">Current analysis</div>
                  <div className="data-list">
                    <div className="data-row">
                      <span className="label">File</span>
                      <span className="value">{fileInfo?.name || "-"}</span>
                    </div>
                    <div className="data-row">
                      <span className="label">Mode</span>
                      <span className="value" style={{ textTransform: "capitalize" }}>
                        {mediaLabel}
                      </span>
                    </div>
                    <div className="data-row">
                      <span className="label">Analysis ID</span>
                      <span className="value mono">{analysisId}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="surface-muted" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <ShieldCheck
                    size={20}
                    color="var(--accent)"
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontWeight: 700 }}>Secure handling</div>
                    <p className="note" style={{ margin: "8px 0 0" }}>
                      Media is prepared before request, then cleared after
                      submission.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}
