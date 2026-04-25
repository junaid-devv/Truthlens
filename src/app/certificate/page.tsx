"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  RefreshCw,
  Share2,
  Shield,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BrandMark from "@/components/BrandMark";
import { AnalysisResult, getRiskColor, getVerdictLabel } from "@/lib/types";

export default function CertificatePage() {
  const router = useRouter();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
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
    if (!result) {
      router.replace("/upload");
    } else if (result.error) {
      router.replace("/results");
    }
  }, [result, router]);

  if (!result || result.error) {
    return (
      <>
        <Navbar />
        <div className="page-content">
          <main
            className="page-container"
            style={{
              minHeight: "70vh",
              display: "grid",
              placeItems: "center",
            }}
          >
            <div className="icon-button spin">
              <RefreshCw size={20} />
            </div>
          </main>
        </div>
      </>
    );
  }

  const riskColor = getRiskColor(result.risk_level);
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

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleDownloadPNG() {
    const currentResult = result;
    if (!certificateRef.current || downloading || !currentResult) {
      return;
    }

    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: "#0e1826",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `truthlens-certificate-${currentResult.analysisId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadPDF() {
    const currentResult = result;
    if (!certificateRef.current || downloading || !currentResult) {
      return;
    }

    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: "#0e1826",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2],
      });
      pdf.addImage(imageData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`truthlens-certificate-${currentResult.analysisId}.pdf`);
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
            <h1 className="page-title">Verification certificate ready.</h1>
            <p className="page-subtitle">
              Export or share the signed verification summary.
            </p>
          </header>

          <section className="certificate-shell">
            <div ref={certificateRef} className="cert-surface" style={{ padding: 36 }}>
              <div className="cert-watermark">TruthLens</div>

              <div className="stack-lg" style={{ position: "relative", zIndex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 24,
                    flexWrap: "wrap",
                  }}
                >
                  <BrandMark compact />
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        color: "var(--gold)",
                        fontSize: "0.78rem",
                        fontWeight: 800,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                      }}
                    >
                      Verification certificate
                    </div>
                    <div className="note mono" style={{ marginTop: 6 }}>
                      {result.fileType} analysis
                    </div>
                  </div>
                </div>

                <div
                  className="section-divider"
                  style={{ borderColor: "rgba(198, 168, 106, 0.35)" }}
                />

                <div className="section-grid-2">
                  <div className="stack-md">
                    <div>
                      <div className="label">Verdict</div>
                      <div
                        style={{
                          marginTop: 10,
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "10px 16px",
                          borderRadius: 999,
                          border: `1px solid ${riskColor}55`,
                          background: `${riskColor}12`,
                          color: riskColor,
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                        }}
                      >
                        {result.risk_level} risk
                      </div>
                    </div>

                    <div>
                      <div className="result-score status-value" style={{ color: riskColor }}>
                        {result.probability_ai_generated}%
                      </div>
                      <div className="note">probability of AI generation</div>
                    </div>

                    <div className="stack-sm">
                      <div>
                        <div className="label">Finding</div>
                        <div style={{ marginTop: 8, fontWeight: 700, fontSize: "1.1rem" }}>
                          {result.verdict_sentence}
                        </div>
                      </div>
                      <p className="note" style={{ margin: 0 }}>
                        {result.plain_language_explanation}
                      </p>
                    </div>
                  </div>

                  <div className="stack-md">
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <div className="cert-seal">
                        <div style={{ textAlign: "center" }}>
                          <Shield size={22} color="var(--gold)" />
                          <div
                            style={{
                              marginTop: 4,
                              color: "var(--gold)",
                              fontSize: "0.52rem",
                              fontWeight: 800,
                              letterSpacing: "0.14em",
                              textTransform: "uppercase",
                            }}
                          >
                            Verified
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="data-list">
                      <div className="data-row">
                        <span className="label">File name</span>
                        <span className="value">{result.fileName}</span>
                      </div>
                      <div className="data-row">
                        <span className="label">Issued</span>
                        <span className="value">{formattedDate}</span>
                      </div>
                      <div className="data-row">
                        <span className="label">Certificate ID</span>
                        <span className="value mono">{result.analysisId}</span>
                      </div>
                      <div className="data-row">
                        <span className="label">Public verdict label</span>
                        <span className="value">
                          {getVerdictLabel(result.overall_verdict)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="section-divider"
                  style={{ borderColor: "rgba(198, 168, 106, 0.35)" }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 20,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ color: "var(--gold)", fontWeight: 700 }}>
                      TruthLens Deepfake Detection
                    </div>
                    <div className="note">
                      Generated from your latest local result.
                    </div>
                  </div>
                  <div className="mono" style={{ color: "var(--gold)" }}>
                    {result.analysisId}
                  </div>
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
                <Download size={16} />
                {downloading ? "Exporting..." : "Download PNG"}
              </button>

              <button
                type="button"
                className="button button-secondary button-wide"
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                <Download size={16} />
                {downloading ? "Exporting..." : "Download PDF"}
              </button>

              <button
                type="button"
                className="button button-secondary button-wide"
                onClick={handleCopy}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy verification link"}
              </button>

              <button
                type="button"
                className="button button-secondary button-wide"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: "TruthLens verification certificate",
                        text: `Verdict: ${getVerdictLabel(result.overall_verdict)}`,
                        url: shareUrl,
                      });
                    } catch {
                      return;
                    }
                  } else {
                    await handleCopy();
                  }
                }}
              >
                <Share2 size={16} />
                Share
              </button>

              <div className="surface-muted" style={{ padding: 22 }}>
                <p className="note" style={{ margin: 0 }}>
                  Includes verdict, probability, timestamp, and certificate ID.
                </p>
              </div>

              <Link href="/results" className="button button-secondary button-wide">
                Back to Results
              </Link>
              <Link href="/upload" className="button button-secondary button-wide">
                Start Another Analysis
              </Link>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}
