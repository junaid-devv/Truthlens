"use client";

import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  FileCheck2,
  Image as ImageIcon,
  ScanSearch,
  ShieldCheck,
  Video,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import BrandMark from "@/components/BrandMark";

const detectionStack = [
  {
    icon: AudioLines,
    title: "Audio forensics",
    description: "Voice cloning and synthetic timbre detection.",
    status: "Active",
  },
  {
    icon: ImageIcon,
    title: "Image verification",
    description: "Artifact and lighting consistency analysis.",
    status: "Ready",
  },
  {
    icon: Video,
    title: "Video analysis",
    description: "Frame continuity and A/V mismatch checks.",
    status: "Ready",
  },
];

const workflow = [
  { step: "01", title: "Upload", copy: "Audio, image, or video — up to 50 MB." },
  { step: "02", title: "Analyze", copy: "Multi-model pipeline runs in under 25 seconds." },
  { step: "03", title: "Export", copy: "Risk verdict, evidence summary, and certificate." },
];

const useCases = [
  { icon: ShieldCheck, title: "Fraud response", copy: "Validate suspicious calls and forwarded media." },
  { icon: ScanSearch, title: "Newsroom checks", copy: "Screen UGC before publication." },
  { icon: FileCheck2, title: "Operations", copy: "Create shareable proof for internal review." },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container stack-lg">

          {/* Hero */}
          <section className="hero-grid fade-in">
            <div>
              <span className="eyebrow">Voice · Image · Video</span>
              <h1 className="page-title">
                Detect deepfakes.<br />Act on evidence.
              </h1>
              <p className="page-subtitle">
                One pipeline from upload to verdict, with a certificate you can share.
              </p>

              <div className="hero-actions">
                <Link href="/upload" className="button button-primary">
                  Start Analysis
                  <ArrowRight size={16} />
                </Link>
                <Link href="/history" className="button button-secondary">
                  History
                </Link>
              </div>

              <div className="metric-grid">
                {[
                  { v: "<25s", l: "Turnaround" },
                  { v: "9", l: "Models" },
                  { v: "3", l: "Media modes" },
                  { v: "On-device", l: "Privacy" },
                ].map(({ v, l }) => (
                  <div key={l} className="metric-item">
                    <div className="metric-value">{v}</div>
                    <div className="metric-label">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detection stack card */}
            <aside className="surface" style={{ padding: 24 }}>
              <div className="stack-md">
                <span className="eyebrow">Detection stack</span>

                {detectionStack.map((item, i) => (
                  <div key={item.title} className={`signal-row${i === 0 ? " is-emphasis" : ""}`}>
                    <span className="signal-icon">
                      <item.icon size={18} color={i === 0 ? "var(--red)" : "var(--text-2)"} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{item.title}</div>
                      <div className="note" style={{ fontSize: "0.83rem" }}>{item.description}</div>
                    </div>
                    <span className={`pill ${i === 0 ? "pill-accent" : "pill-success"}`}>
                      {item.status}
                    </span>
                  </div>
                ))}

                <div className="section-divider" />

                <div className="signal-row">
                  <span className="signal-icon">
                    <FileCheck2 size={18} color="var(--text-2)" />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>Certificate output</div>
                    <div className="note" style={{ fontSize: "0.83rem" }}>Exportable verdict and evidence.</div>
                  </div>
                  <span className="pill pill-success">Included</span>
                </div>
              </div>
            </aside>
          </section>

          {/* Workflow */}
          <section className="stack-lg">
            <span className="eyebrow">How it works</span>
            <div className="surface" style={{ padding: "4px 24px" }}>
              {workflow.map((item) => (
                <div key={item.step} className="definition-row" style={{ alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span
                      className="mono"
                      style={{ color: "var(--text-3)", fontSize: "0.75rem", letterSpacing: "0.08em" }}
                    >
                      {item.step}
                    </span>
                    <div style={{ fontSize: "1rem", fontWeight: 700 }}>{item.title}</div>
                  </div>
                  <p className="note" style={{ margin: 0 }}>{item.copy}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Use cases */}
          <section className="section-grid-3">
            {useCases.map((item) => (
              <div key={item.title} className="surface-muted" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span className="signal-icon" style={{ width: 36, height: 36 }}>
                    <item.icon size={16} color="var(--red)" />
                  </span>
                  <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{item.title}</div>
                </div>
                <p className="note" style={{ margin: 0, fontSize: "0.88rem" }}>{item.copy}</p>
              </div>
            ))}
          </section>

          {/* CTA */}
          <section className="surface" style={{ padding: "28px 32px" }}>
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
                <h2 className="section-title" style={{ fontSize: "1.6rem" }}>
                  Start your analysis now.
                </h2>
                <p className="note" style={{ marginTop: 6 }}>
                  Upload media, run the stack, get a verdict you can act on.
                </p>
              </div>
              <Link href="/upload" className="button button-primary">
                Open Analyzer <ArrowRight size={16} />
              </Link>
            </div>
          </section>

          {/* Footer */}
          <footer
            style={{
              paddingTop: 24,
              borderTop: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <BrandMark compact />
            <div className="note" style={{ fontSize: "0.8rem" }}>
              Voice · Image · Video · Certificates
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}