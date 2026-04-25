"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, RefreshCw } from "lucide-react";
import Navbar from "@/components/Navbar";
import AppLogo from "@/components/AppLogo";
import BrandMark from "@/components/BrandMark";
import { AnalysisResult, getRiskColor, getVerdictLabel } from "@/lib/types";

export default function CertificatePage() {
  const router = useRouter();
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

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
    if (!result) router.replace("/upload");
    else if (result.error) router.replace("/results");
  }, [result, router]);

  if (!result || result.error) {
    return (
      <>
        <Navbar />
        <div className="page-content">
          <main
            className="page-container"
            style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}
          >
            <div className="icon-button spin">
              <RefreshCw size={18} />
            </div>
          </main>
        </div>
      </>
    );
  }

  const riskColor = getRiskColor(result.risk_level);
  const verdictLabel = getVerdictLabel(result.overall_verdict);
  const confidenceColor =
    result.confidence_in_verdict === "high"
      ? "var(--green)"
      : result.confidence_in_verdict === "medium"
        ? "var(--amber)"
        : "var(--danger)";
  const riskPillClass =
    result.risk_level === "critical" || result.risk_level === "high"
      ? "pill-danger"
      : result.risk_level === "medium"
        ? "pill-warning"
        : "pill-success";
  const verdictPillClass =
    result.overall_verdict === "likely_ai"
      ? "pill-danger"
      : result.overall_verdict === "uncertain"
        ? "pill-warning"
        : "pill-success";

  const formattedDate = result.timestamp
    ? new Date(result.timestamp).toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    : "Unavailable";

  const shareUrl = `https://truthlens.shield/verify/${result.analysisId}`;

  async function handleDownloadPNG() {
    if (!certRef.current || downloading) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(certRef.current, {
        backgroundColor: "#08162d",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const a = document.createElement("a");
      a.download = `truthlens-${result.analysisId}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadPDF() {
    if (!certRef.current || downloading) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(certRef.current, {
        backgroundColor: "#08162d",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(img, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`truthlens-${result.analysisId}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container stack-lg">
          <header className="page-intro fade-in">
            <span className="eyebrow">Certificate</span>
            <h1 className="page-title">Verification ready.</h1>
            <p className="page-subtitle">
              Export or share an audit-ready proof sheet for this analysis.
            </p>
          </header>

          <section className="certificate-shell">
            <div
              ref={certRef}
              className="cert-surface cert-surface--enhanced"
              style={{ padding: 32 }}
            >
              <div className="cert-watermark">TruthLens</div>

              <div className="stack-lg cert-content" style={{ position: "relative", zIndex: 1 }}>
                <div className="cert-header-row">
                  <BrandMark compact />
                  <div className="cert-header-meta">
                    <div className="cert-kicker">Verification Certificate</div>
                    <div className="note cert-subkicker">
                      {result.fileType} forensic analysis
                    </div>
                  </div>
                </div>

                <div className="cert-chip-row">
                  <div className="cert-chip">
                    <span className="label">Certificate ID</span>
                    <span className="value mono cert-chip-value">{result.analysisId}</span>
                  </div>
                  <div className="cert-chip">
                    <span className="label">Issued</span>
                    <span className="value cert-chip-value">{formattedDate}</span>
                  </div>
                  <div className="cert-chip">
                    <span className="label">Status</span>
                    <span className={`pill ${verdictPillClass}`}>{verdictLabel}</span>
                  </div>
                </div>

                <div className="section-grid-2 cert-main-grid">
                  <div className="stack-md">
                    <span className={`pill ${riskPillClass}`}>{result.risk_level} risk</span>

                    <div>
                      <div className="result-score" style={{ color: riskColor }}>
                        {result.probability_ai_generated}%
                      </div>
                      <div className="label" style={{ marginTop: 4 }}>
                        AI generation probability
                      </div>
                    </div>

                    <div className="stack-sm">
                      <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                        {result.verdict_sentence}
                      </div>
                      <p className="note">{result.plain_language_explanation}</p>
                    </div>

                    <div className="cert-recommendation">
                      <div className="label">Recommended action</div>
                      <p className="note">{result.recommended_action}</p>
                    </div>
                  </div>

                  <div className="cert-verify-card stack-md">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div className="cert-seal">
                        <AppLogo size={30} title="TruthLens logo" />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <span className={`pill ${verdictPillClass}`}>{verdictLabel}</span>
                        <span
                          className="note"
                          style={{ fontSize: "0.8rem", color: confidenceColor }}
                        >
                          Confidence: {result.confidence_in_verdict}
                        </span>
                      </div>
                    </div>

                    <div className="data-list">
                      {[
                        { l: "File", v: result.fileName },
                        { l: "File type", v: result.fileType },
                        { l: "Risk level", v: result.risk_level },
                        { l: "Cert ID", v: result.analysisId, mono: true },
                      ].map(({ l, v, mono }) => (
                        <div key={l} className="data-row">
                          <span className="label">{l}</span>
                          <span
                            className={mono ? "value mono" : "value"}
                            style={{ fontSize: mono ? "0.74rem" : undefined }}
                          >
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="cert-verify-link mono">{shareUrl}</div>
                  </div>
                </div>

                <div className="cert-footer">
                  <div>
                    <div className="cert-kicker">TruthLens Deepfake Detection</div>
                    <p className="note cert-footer-note">
                      Generated from local analysis result and anchored to this
                      certificate ID.
                    </p>
                  </div>
                  <div className="mono cert-footer-id">{result.analysisId}</div>
                </div>
              </div>
            </div>

            <aside className="surface-stack">
              <button
                type="button"
                className="button button-primary button-wide"
                onClick={handleDownloadPNG}
                disabled={downloading}
              >
                <Download size={15} />
                {downloading ? "Exporting..." : "Download PNG"}
              </button>

              <button
                type="button"
                className="button button-secondary button-wide"
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                <Download size={15} />
                {downloading ? "Exporting..." : "Download PDF"}
              </button>

              <div className="surface-muted" style={{ padding: 16 }}>
                <p className="note" style={{ margin: 0, fontSize: "0.83rem" }}>
                  Includes verdict, confidence, risk score, timestamp, and
                  verification ID.
                </p>
              </div>

              <Link href="/results" className="button button-secondary button-wide">
                {"<- Results"}
              </Link>
              <Link href="/upload" className="button button-secondary button-wide">
                New Analysis
              </Link>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}
