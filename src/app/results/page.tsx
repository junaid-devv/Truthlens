"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Download,
  RefreshCw,
  Share2,
  ShieldCheck,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AudioTab from "@/components/tabs/AudioTab";
import ContextTab from "@/components/tabs/ContextTab";
import ImageTab from "@/components/tabs/ImageTab";
import ReportTab from "@/components/tabs/ReportTab";
import {
  AnalysisResult,
  getRiskColor,
  getVerdictColor,
  getVerdictLabel,
} from "@/lib/types";
import { saveToHistory } from "@/lib/storage";

function getTabsForFileType(fileType: string) {
  const tabs = ["Overview"];
  if (fileType === "audio" || fileType === "video") tabs.push("Audio");
  if (fileType === "image" || fileType === "video") tabs.push("Image");
  tabs.push("Context", "Report");
  return tabs;
}

function ProgressBar({
  value,
  color,
}: {
  value: number;
  color: string;
}) {
  return (
    <div className="progress-track">
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          background: color,
          transition: "width 600ms ease",
        }}
      />
    </div>
  );
}

function OverviewRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="data-row">
      <span className="label">{label}</span>
      <span className="value" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");
  const [shareCopied, setShareCopied] = useState(false);
  const [result] = useState<AnalysisResult | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem("analysisResult");
      return stored ? (JSON.parse(stored) as AnalysisResult) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!result || result.error) {
      router.replace("/upload");
    }
  }, [result, router]);

  useEffect(() => {
    if (result && !result.error) {
      saveToHistory(result);
    }
  }, [result]);

  if (!result || result.error) {
    return (
      <>
        <Navbar />
        <div className="page-content">
          <main
            className="page-container"
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: "70vh",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                className="icon-button spin"
                style={{ margin: "0 auto 16px", width: 52, height: 52 }}
              >
                <RefreshCw size={22} />
              </div>
              <div className="note">Loading the analysis workspace.</div>
            </div>
          </main>
        </div>
      </>
    );
  }

  const riskColor = getRiskColor(result.risk_level);
  const verdictColor = getVerdictColor(result.overall_verdict);
  const confidenceColor =
    result.confidence_in_verdict === "high"
      ? "var(--success)"
      : result.confidence_in_verdict === "medium"
        ? "var(--warning)"
        : "var(--danger)";

  const emotionValue =
    result.fileType === "image"
      ? "Not applicable"
      : `${
          result.emotion_consistency.consistency_label === "contradiction"
            ? "Low"
            : result.emotion_consistency.consistency_label === "mismatch"
              ? "Medium"
              : "High"
        } (${result.emotion_consistency.consistency_score}%)`;

  async function handleShare() {
    const currentResult = result;
    if (!currentResult) {
      return;
    }

    const shareUrl = `${window.location.origin}/certificate`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `TruthLens analysis for ${currentResult.fileName}`,
          text: `Verdict: ${getVerdictLabel(currentResult.overall_verdict)}`,
          url: shareUrl,
        });
      } catch {
        return;
      }
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1800);
  }

  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container stack-lg">
          <header
            className="fade-in"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div className="page-intro">
              <span className="eyebrow">Analysis complete</span>
              <h1 className="page-title">{result.fileName}</h1>
              <p className="page-subtitle">
                Review the verdict, then inspect details by tab.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="button" className="button button-secondary" onClick={handleShare}>
                <Share2 size={16} />
                {shareCopied ? "Link copied" : "Share"}
              </button>
              <Link href="/upload" className="button button-secondary">
                <RefreshCw size={16} />
                New Scan
              </Link>
              <Link href="/certificate" className="button button-primary">
                <Download size={16} />
                Certificate
              </Link>
            </div>
          </header>

          <section className="result-shell">
            <div className="surface" style={{ padding: 32 }}>
              <div className="stack-md">
                <span
                  className={`pill ${
                    result.risk_level === "critical" || result.risk_level === "high"
                      ? "pill-danger"
                      : result.risk_level === "medium"
                        ? "pill-warning"
                        : "pill-success"
                  }`}
                >
                  {result.risk_level} risk
                </span>

                <div className="section-grid-2" style={{ alignItems: "start" }}>
                  <div className="stack-sm">
                    <h2 className="section-title">{result.verdict_sentence}</h2>
                    <p className="note" style={{ margin: 0 }}>
                      {result.plain_language_explanation}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <div className="result-score status-value" style={{ color: riskColor }}>
                      {result.probability_ai_generated}%
                    </div>
                    <div className="label">probability of AI generation</div>
                  </div>
                </div>

                <div className="stack-sm">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      fontSize: "0.88rem",
                      color: "var(--text-soft)",
                    }}
                  >
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                  <ProgressBar value={result.probability_ai_generated} color={riskColor} />
                </div>

                <div className="surface-muted" style={{ padding: 20 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <AlertTriangle
                      size={18}
                      color={riskColor}
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: riskColor }}>
                        Recommended action
                      </div>
                      <p className="note" style={{ margin: "8px 0 0" }}>
                        {result.recommended_action}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="surface-stack">
              <div className="surface-muted" style={{ padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <ShieldCheck size={18} color="var(--accent)" />
                  <div style={{ fontWeight: 700 }}>At a glance</div>
                </div>

                <div className="data-list" style={{ marginTop: 12 }}>
                  <OverviewRow
                    label="Verdict"
                    value={getVerdictLabel(result.overall_verdict)}
                    color={verdictColor}
                  />
                  <OverviewRow
                    label="Risk level"
                    value={result.risk_level}
                    color={riskColor}
                  />
                  <OverviewRow
                    label="Confidence"
                    value={result.confidence_in_verdict}
                    color={confidenceColor}
                  />
                  <OverviewRow
                    label="Content type"
                    value={result.content_classification.likely_type || "-"}
                  />
                  <OverviewRow label="Emotion consistency" value={emotionValue} />
                  <OverviewRow label="Analysis ID" value={result.analysisId} />
                </div>
              </div>
            </aside>
          </section>

          <section className="surface-muted" style={{ padding: 16 }}>
            <div className="tab-nav">
              {getTabsForFileType(result.fileType).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`tab-btn${activeTab === tab ? " active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </section>

          <section className="surface" style={{ padding: 28 }}>
            {activeTab === "Overview" && (
              <div className="stack-lg">
                <div className="summary-grid">
                  <div className="summary-cell">
                    <div className="label">Source file</div>
                    <div style={{ marginTop: 8, fontWeight: 700 }}>{result.fileName}</div>
                  </div>
                  <div className="summary-cell">
                    <div className="label">Media mode</div>
                    <div
                      style={{
                        marginTop: 8,
                        fontWeight: 700,
                        textTransform: "capitalize",
                      }}
                    >
                      {result.fileType}
                    </div>
                  </div>
                  <div className="summary-cell">
                    <div className="label">Matched scenario</div>
                    <div style={{ marginTop: 8, fontWeight: 700 }}>
                      {result.content_classification.matched_scenario}
                    </div>
                  </div>
                  <div className="summary-cell">
                    <div className="label">Suggested scenario</div>
                    <div style={{ marginTop: 8, fontWeight: 700 }}>
                      {result.suggested_scenario}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Audio" && <AudioTab result={result} />}
            {activeTab === "Image" && <ImageTab result={result} />}
            {activeTab === "Context" && <ContextTab result={result} />}
            {activeTab === "Report" && <ReportTab result={result} />}
          </section>
        </main>
      </div>
    </>
  );
}
