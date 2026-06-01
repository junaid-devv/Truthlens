"use client";

import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Image as ImageIcon,
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

export default function HomePage() {
  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container stack-lg">

          {/* Hero */}
          <section className="hero-grid fade-in">
            <div style={{ alignSelf: "center" }}>
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

            {/* System Status Visualizer */}
            <aside className="surface" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {/* Scan HUD image overlay */}
              <div style={{ position: "relative", width: "100%", height: 210, background: "#050b18", borderBottom: "1px solid var(--line)", overflow: "hidden" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/hud_scanner.png" alt="HUD Scanner" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
                <span className="pill pill-accent" style={{ position: "absolute", top: 12, right: 12, background: "rgba(2, 6, 23, 0.8)", borderColor: "var(--red-border)" }}>
                  ● SCANNER ACTIVE
                </span>
              </div>
              <div style={{ padding: 22 }} className="stack-md">
                <span className="eyebrow" style={{ fontSize: "0.68rem" }}>Detection stack status</span>

                {detectionStack.map((item, i) => (
                  <div key={item.title} className="signal-row" style={{ padding: "8px 0" }}>
                    <span className="brand-mark__badge compact" style={{ border: "1px solid var(--line)" }}>
                      <item.icon size={13} color="var(--text-2)" />
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{item.title}</div>
                      <div className="note" style={{ fontSize: "0.78rem" }}>{item.description}</div>
                    </div>
                    <span className="pill pill-success" style={{ fontSize: "0.68rem", paddingInline: 8, minHeight: 22 }}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </aside>
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