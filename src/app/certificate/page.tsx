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
    result.overall_verdict === "LIKELY_FAKE"
      ? "pill-danger"
      : result.overall_verdict === "UNCERTAIN"
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

  const shareUrl = result ? `https://truthlens.shield/verify/${result.analysisId}` : "";

  async function handleDownloadPNG() {
    if (!certRef.current || !result || downloading) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(certRef.current, {
        backgroundColor: "#02070d",
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
    if (!certRef.current || !result || downloading) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(certRef.current, {
        backgroundColor: "#02070d",
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
            <span className="eyebrow">Evidence certificate</span>
            <h1 className="page-title">Forensic proof sheet.</h1>
            <p className="page-subtitle">
              Export a compact, audit-ready record of the verdict, confidence,
              and case identifier.
            </p>
          </header>

          <section className="certificate-shell">
            <div
              ref={certRef}
              className="cert-surface cert-surface--enhanced"
              style={{ padding: "36px 32px" }}
            >
              <div className="cert-watermark">TruthLens</div>

              <div className="stack-lg cert-content" style={{ position: "relative", zIndex: 1 }}>
                <div className="cert-header-row">
                  <BrandMark compact />
                  <div className="cert-header-meta">
                    <div className="cert-kicker">Forensic Certificate</div>
                    <div className="note cert-subkicker" style={{ fontSize: "0.85rem" }}>
                      {result.fileType} forensic analysis
                    </div>
                  </div>
                </div>

                <div className="cert-chip-row">
                  <div className="cert-chip" style={{ background: "var(--bg-2)" }}>
                    <span className="label" style={{ fontSize: "0.78rem" }}>Certificate ID</span>
                    <span className="value mono cert-chip-value" style={{ fontSize: "0.82rem", fontWeight: 500 }}>{result.analysisId}</span>
                  </div>
                  <div className="cert-chip" style={{ background: "var(--bg-2)" }}>
                    <span className="label" style={{ fontSize: "0.78rem" }}>Issued</span>
                    <span className="value cert-chip-value" style={{ fontSize: "0.82rem", fontWeight: 500 }}>{formattedDate}</span>
                  </div>
                  <div className="cert-chip" style={{ background: "var(--bg-2)" }}>
                    <span className="label" style={{ fontSize: "0.78rem" }}>Status</span>
                    <span className={`pill ${verdictPillClass}`} style={{ fontSize: "0.68rem", minHeight: 22 }}>{verdictLabel}</span>
                  </div>
                </div>

                <div className="section-grid-2 cert-main-grid">
                  <div className="stack-md">
                    <span className={`pill ${riskPillClass}`} style={{ fontSize: "0.68rem", minHeight: 22 }}>{result.risk_level} risk</span>

                    <div>
                      <div className="result-score" style={{ color: riskColor, fontSize: "4.2rem" }}>
                        {result.probability_ai_generated}%
                      </div>
                      <div className="label" style={{ marginTop: 4, fontSize: "0.78rem" }}>
                        AI generation probability
                      </div>
                    </div>

                    <div className="stack-sm" style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: "1.1rem", lineHeight: 1.3 }}>
                        {result.verdict_sentence}
                      </div>
                      <p className="note" style={{ fontSize: "0.86rem" }}>{result.plain_language_explanation}</p>
                    </div>

                    <div className="cert-recommendation" style={{ background: "var(--bg-2)" }}>
                      <div className="label" style={{ fontSize: "0.8rem" }}>Recommended action</div>
                      <p className="note" style={{ marginTop: 6, fontSize: "0.85rem" }}>{result.recommended_action}</p>
                    </div>
                  </div>

                  <div className="cert-verify-card stack-md" style={{ background: "var(--bg-2)" }}>
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
                        <AppLogo size={24} title="TruthLens logo" />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                        <span className={`pill ${verdictPillClass}`} style={{ fontSize: "0.68rem", minHeight: 22 }}>{verdictLabel}</span>
                        <span
                          className="note"
                          style={{ fontSize: "0.75rem", color: confidenceColor, fontWeight: 500 }}
                        >
                          Confidence: {result.confidence_in_verdict}
                        </span>
                      </div>
                    </div>

                    <div className="data-list" style={{ marginTop: 12 }}>
                      {[
                        { l: "File", v: result.fileName },
                        { l: "File type", v: result.fileType },
                        { l: "Risk level", v: result.risk_level },
                        { l: "Cert ID", v: result.analysisId, mono: true },
                      ].map(({ l, v, mono }) => (
                        <div key={l} className="data-row" style={{ padding: "8px 0" }}>
                          <span className="label" style={{ fontSize: "0.8rem" }}>{l}</span>
                          <span
                            className={mono ? "value mono" : "value"}
                            style={{ fontSize: mono ? "0.72rem" : "0.84rem", fontWeight: 500 }}
                          >
                            {v}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="cert-verify-link mono" style={{ background: "var(--bg)", border: "1px solid var(--line)" }}>{shareUrl}</div>
                  </div>
                </div>

                <div className="cert-footer">
                  <div>
                    <div className="cert-kicker">TruthLens Deepfake Detection</div>
                    <p className="note cert-footer-note" style={{ fontSize: "0.82rem" }}>
                      Generated from the local case result and anchored to this
                      certificate identifier.
                    </p>
                  </div>
                  <div className="mono cert-footer-id" style={{ fontSize: "0.75rem" }}>{result.analysisId}</div>
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
                  verification identifier.
                </p>
              </div>

              <Link href="/results" className="button button-secondary button-wide">
                Back to Results
              </Link>
              <Link href="/upload" className="button button-secondary button-wide">
                New Case
              </Link>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}
