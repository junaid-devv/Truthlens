"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Download,
  FileText,
  Gauge,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import AudioTab from "@/components/tabs/AudioTab";
import ContextTab from "@/components/tabs/ContextTab";
import ImageTab from "@/components/tabs/ImageTab";
import {
  AnalysisResult,
  getRiskColor,
  getVerdictColor,
  getVerdictLabel,
} from "@/lib/types";
import { saveToHistory } from "@/lib/storage";
import { getFileStoreDataUrl } from "@/lib/fileStore";

function getTabsForFileType(fileType: string) {
  const tabs = ["Overview"];
  if (fileType === "audio" || fileType === "video") tabs.push("Audio");
  if (fileType === "image" || fileType === "video") tabs.push("Image");
  tabs.push("Context");
  return tabs;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="progress-track" aria-hidden="true">
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          background: color,
          borderRadius: 999,
          transition: "width 700ms ease",
        }}
      />
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");
  const [imageUrl] = useState<string | null>(() =>
    typeof window === "undefined" ? null : getFileStoreDataUrl(),
  );

  const [result] = useState<AnalysisResult | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const s = sessionStorage.getItem("analysisResult");
      return s ? (JSON.parse(s) as AnalysisResult) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!result || result.error) router.replace("/upload");
  }, [result, router]);

  useEffect(() => {
    if (result && !result.error) saveToHistory(result);
  }, [result]);

  const tabs = useMemo(
    () => (result ? getTabsForFileType(result.fileType) : []),
    [result],
  );

  if (!result || result.error) {
    return (
      <>
        <Navbar />
        <div className="page-content">
          <main
            className="page-container"
            style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}
          >
            <div className="icon-button spin" style={{ width: 44, height: 44 }}>
              <RefreshCw size={18} />
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
  const isAuthenticOrUncertain =
    result.overall_verdict === "REAL" || result.overall_verdict === "UNCERTAIN";
  const displayedScore = isAuthenticOrUncertain
    ? 100 - result.probability_ai_generated
    : result.probability_ai_generated;
  const scoreLabel = isAuthenticOrUncertain
    ? "Authenticity probability"
    : "AI generation probability";
  const riskPillClass =
    result.risk_level === "critical" || result.risk_level === "high"
      ? "pill-danger"
      : result.risk_level === "medium"
        ? "pill-warning"
        : "pill-success";

  const evidenceStats = [
    {
      label: "Verdict",
      value: getVerdictLabel(result.overall_verdict),
      color: verdictColor,
    },
    {
      label: "Risk level",
      value: result.risk_level,
      color: riskColor,
    },
    {
      label: "Confidence",
      value: result.confidence_in_verdict,
      color: confidenceColor,
    },
    {
      label: "Media mode",
      value: result.fileType,
      color: "var(--accent-2)",
    },
  ];

  const overviewCells = [
    { label: "Source evidence", value: result.fileName },
    { label: "Matched scenario", value: result.content_classification.matched_scenario },
    { label: "Likely content type", value: result.content_classification.likely_type || "-" },
    { label: "Suggested scenario", value: result.suggested_scenario },
    { label: "Audio artifacts", value: `${result.audio_artifacts.length} detected` },
    {
      label: "Visual artifacts",
      value: `${(result.visual_artifacts ?? result.image_artifacts).length} detected`,
    },
  ];

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
              <span className="eyebrow">Forensic result</span>
              <h1
                className="page-title"
                style={{ fontSize: "clamp(1.9rem, 3.8vw, 3.2rem)" }}
              >
                Analysis complete
              </h1>
              <p className="page-subtitle" style={{ overflowWrap: "anywhere" }}>
                Analysis ID <span className="mono">{result.analysisId}</span>
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/upload" className="button button-secondary">
                <RefreshCw size={15} />
                New Scan
              </Link>
              <Link href="/certificate" className="button button-primary">
                <Download size={15} />
                Certificate
              </Link>
            </div>
          </header>

          <section className="result-dashboard">
            <div className="surface verdict-panel">
              <div className="stack-md">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 14,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span className={`pill ${riskPillClass}`}>
                    {result.risk_level} risk
                  </span>
                  <span className="pill pill-accent">
                    {getVerdictLabel(result.overall_verdict)}
                  </span>
                </div>

                <div className="verdict-meter">
                  <div style={{ textAlign: "center" }}>
                    <div
                      className="result-score"
                      style={{
                        color: isAuthenticOrUncertain ? "var(--success)" : riskColor,
                      }}
                    >
                      {displayedScore}%
                    </div>
                    <div
                      className="mono"
                      style={{
                        marginTop: 8,
                        color: "var(--text-3)",
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      {scoreLabel}
                    </div>
                  </div>
                </div>

                <ProgressBar
                  value={displayedScore}
                  color={isAuthenticOrUncertain ? "var(--success)" : riskColor}
                />
              </div>

              <div
                className="surface-muted"
                style={{
                  padding: 16,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <AlertTriangle
                  size={18}
                  color={riskColor}
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontWeight: 850, color: riskColor }}>
                    Recommended action
                  </div>
                  <p className="note" style={{ marginTop: 5 }}>
                    {result.recommended_action}
                  </p>
                </div>
              </div>
            </div>

            <div className="stack-md">
              <div className="surface" style={{ padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 18,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 850, fontSize: "1.05rem" }}>
                      Verdict summary
                    </div>
                    <p className="note" style={{ marginTop: 4 }}>
                      {result.verdict_sentence}
                    </p>
                  </div>
                  <Gauge size={22} color="var(--accent-2)" />
                </div>

                <p className="note" style={{ marginBottom: 20 }}>
                  {result.plain_language_explanation}
                </p>

                <div className="evidence-grid">
                  {evidenceStats.map((item) => (
                    <div key={item.label} className="evidence-card">
                      <div className="label">{item.label}</div>
                      <div
                        style={{
                          marginTop: 8,
                          color: item.color,
                          fontWeight: 850,
                          textTransform:
                            item.label === "Media mode" ? "capitalize" : undefined,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface" style={{ padding: 24 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 18,
                  }}
                >
                  <div style={{ fontWeight: 850, fontSize: "1.05rem" }}>
                    Evidence snapshot
                  </div>
                  <ShieldCheck size={21} color="var(--accent-2)" />
                </div>
                <div className="data-list">
                  {[
                    { label: "Content type", value: result.content_classification.likely_type || "-" },
                    { label: "Scenario match", value: result.content_classification.matched_scenario },
                    { label: "Context confidence", value: `${result.content_classification.confidence}%` },
                    { label: "Contradiction level", value: result.content_classification.contradiction_level },
                  ].map((item) => (
                    <div key={item.label} className="data-row">
                      <span className="label">{item.label}</span>
                      <span className="value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="result-tabs-shell">
            <nav
              className="tab-nav-vertical"
              role="tablist"
              aria-label="Analysis detail sections"
            >
              {tabs.map((tab) => (
                <button
                  key={tab}
                  id={`tab-${tab.toLowerCase()}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`panel-${tab.toLowerCase()}`}
                  className="tab-btn"
                  onClick={() => setActiveTab(tab)}
                  style={{ justifyContent: "flex-start" }}
                >
                  <SlidersHorizontal size={15} />
                  {tab}
                </button>
              ))}
            </nav>

            <section
              id={`panel-${activeTab.toLowerCase()}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab.toLowerCase()}`}
              className="surface tab-panel"
              style={{ padding: 24 }}
            >
              {activeTab === "Overview" && (
                <div className="stack-md">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 4,
                    }}
                  >
                    <FileText size={18} color="var(--accent-2)" />
                    <div style={{ fontWeight: 850 }}>Case overview</div>
                  </div>
                  <div className="summary-grid">
                    {overviewCells.map(({ label, value }) => (
                      <div key={label} className="summary-cell">
                        <div className="label">{label}</div>
                        <div
                          style={{
                            marginTop: 7,
                            fontWeight: 750,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/certificate"
                    className="button button-primary"
                    style={{ alignSelf: "flex-start" }}
                  >
                    Export Certificate
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}
              {activeTab === "Audio" && <AudioTab result={result} />}
              {activeTab === "Image" && (
                <ImageTab result={result} imageUrl={imageUrl} />
              )}
              {activeTab === "Context" && <ContextTab result={result} />}
            </section>
          </section>
        </main>
      </div>
    </>
  );
}
