"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, RefreshCw, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import AudioTab from "@/components/tabs/AudioTab";
import ContextTab from "@/components/tabs/ContextTab";
import ImageTab from "@/components/tabs/ImageTab";
import ReportTab from "@/components/tabs/ReportTab";
import { AnalysisResult, getRiskColor, getVerdictColor, getVerdictLabel } from "@/lib/types";
import { saveToHistory } from "@/lib/storage";
import { getFileStoreDataUrl } from "@/lib/fileStore";

function getTabsForFileType(fileType: string) {
  const tabs = ["Overview"];
  if (fileType === "audio" || fileType === "video") tabs.push("Audio");
  if (fileType === "image" || fileType === "video") tabs.push("Image");
  tabs.push("Context", "Report");
  return tabs;
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="progress-track">
      <div
        style={{
          width: `${value}%`,
          height: "100%",
          background: color,
          transition: "width 700ms ease",
          borderRadius: "2px",
        }}
      />
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Overview");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [result] = useState<AnalysisResult | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const s = sessionStorage.getItem("analysisResult");
      return s ? (JSON.parse(s) as AnalysisResult) : null;
    } catch { return null; }
  });

  useEffect(() => { if (!result || result.error) router.replace("/upload"); }, [result, router]);
  useEffect(() => { if (result && !result.error) saveToHistory(result); }, [result]);
  useEffect(() => { setImageUrl(getFileStoreDataUrl()); }, []);

  if (!result || result.error) {
    return (
      <>
        <Navbar />
        <div className="page-content">
          <main className="page-container" style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
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
    result.confidence_in_verdict === "high" ? "var(--green)" :
      result.confidence_in_verdict === "medium" ? "var(--amber)" : "var(--danger)";

  const emotionValue =
    result.fileType === "image"
      ? "N/A"
      : `${result.emotion_consistency.consistency_label === "contradiction" ? "Low" :
        result.emotion_consistency.consistency_label === "mismatch" ? "Medium" : "High"
      } (${result.emotion_consistency.consistency_score}%)`;

  const riskPillClass =
    result.risk_level === "critical" || result.risk_level === "high"
      ? "pill-danger"
      : result.risk_level === "medium"
        ? "pill-warning"
        : "pill-success";

  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container stack-lg">

          {/* Header */}
          <header
            className="fade-in"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}
          >
            <div className="page-intro">
              <span className="eyebrow">Result</span>
              <h1 className="page-title" style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)" }}>
                {result.fileName}
              </h1>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

          {/* Verdict shell */}
          <section className="result-shell">
            <div className="surface" style={{ padding: 28 }}>
              <div className="stack-md">
                <span className={`pill ${riskPillClass}`}>{result.risk_level} risk</span>

                <div className="section-grid-2" style={{ alignItems: "start", gap: 24 }}>
                  <div className="stack-sm">
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-display)",
                        fontSize: "1.45rem",
                        fontWeight: 600,
                        letterSpacing: "-0.02em",
                        lineHeight: 1.25,
                      }}
                    >
                      {result.verdict_sentence}
                    </h2>
                    <p className="note" style={{ marginTop: 8 }}>{result.plain_language_explanation}</p>
                  </div>

                  <div>
                    <div className="result-score" style={{ color: (result.overall_verdict === "REAL" || result.overall_verdict === "UNCERTAIN") ? "var(--green)" : riskColor }}>
                      {(result.overall_verdict === "REAL" || result.overall_verdict === "UNCERTAIN") ? (100 - result.probability_ai_generated) : result.probability_ai_generated}%
                    </div>
                    <div className="label" style={{ marginTop: 6, fontSize: "0.78rem" }}>
                      {(result.overall_verdict === "REAL" || result.overall_verdict === "UNCERTAIN") ? "AUTHENTICITY PROBABILITY" : "AI GENERATION PROBABILITY"}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="stack-sm" style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.72rem",
                      color: "var(--text-3)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <span>0%</span><span>50%</span><span>100%</span>
                  </div>
                  <ProgressBar 
                    value={(result.overall_verdict === "REAL" || result.overall_verdict === "UNCERTAIN") ? (100 - result.probability_ai_generated) : result.probability_ai_generated} 
                    color={(result.overall_verdict === "REAL" || result.overall_verdict === "UNCERTAIN") ? "var(--green)" : riskColor} 
                  />
                </div>

                {/* Recommended action */}
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    padding: 16,
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r)",
                    background: "var(--bg-2)",
                    marginTop: 12
                  }}
                >
                  <AlertTriangle size={15} color={riskColor} style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: riskColor, fontSize: "0.85rem" }}>
                      Recommended action
                    </div>
                    <p className="note" style={{ marginTop: 4, fontSize: "0.85rem" }}>{result.recommended_action}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* At a glance */}
            <aside>
              <div className="surface" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <ShieldCheck size={14} color="var(--text-3)" />
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>At a glance</div>
                </div>
                <div className="data-list">
                  {[
                    { l: "Verdict", v: getVerdictLabel(result.overall_verdict), c: verdictColor },
                    { l: "Risk", v: result.risk_level, c: riskColor },
                    { l: "Confidence", v: result.confidence_in_verdict, c: confidenceColor },
                    { l: "Content type", v: result.content_classification.likely_type || "—" },
                    { l: "Emotion", v: emotionValue },
                    { l: "ID", v: result.analysisId, mono: true },
                  ].map(({ l, v, c, mono }) => (
                    <div key={l} className="data-row" style={{ padding: "10px 0" }}>
                      <span className="label" style={{ fontSize: "0.82rem" }}>{l}</span>
                      <span
                        className={mono ? "value mono" : "value"}
                        style={c ? { color: c, fontSize: mono ? "0.72rem" : "0.85rem", fontWeight: 600 } : { fontSize: mono ? "0.72rem" : "0.85rem", fontWeight: 600 }}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>

          {/* Tabs */}
          <section style={{ display: "flex", gap: 4, padding: "0" }}>
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

          {/* Tab content */}
          <section className="surface" style={{ padding: 24 }}>
            {activeTab === "Overview" && (
              <div className="summary-grid">
                {[
                  { l: "Source file", v: result.fileName },
                  { l: "Media mode", v: result.fileType, cap: true },
                  { l: "Matched scenario", v: result.content_classification.matched_scenario },
                  { l: "Suggested scenario", v: result.suggested_scenario },
                ].map(({ l, v, cap }) => (
                  <div key={l} className="summary-cell" style={{ background: "var(--bg)" }}>
                    <div className="label" style={{ fontSize: "0.8rem" }}>{l}</div>
                    <div
                      style={{
                        marginTop: 6,
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        textTransform: cap ? "capitalize" : undefined,
                      }}
                    >
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === "Audio" && <AudioTab result={result} />}
            {activeTab === "Image" && <ImageTab result={result} imageUrl={imageUrl} />}
            {activeTab === "Context" && <ContextTab result={result} />}
            {activeTab === "Report" && <ReportTab result={result} />}
          </section>
        </main>
      </div>
    </>
  );
}

