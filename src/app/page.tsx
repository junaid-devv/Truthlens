"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <div className="page-content viewport-page">
        <main className="page-container viewport-container">
          <section className="hero-grid fade-in viewport-grid">
            <div style={{ alignSelf: "center" }}>
              <span className="eyebrow">Deepfake forensics</span>
              <h1 className="page-title" style={{ maxWidth: 720 }}>
                Deepfake forensic analysis.
              </h1>
              <p className="page-subtitle">
                Upload suspicious media and get a clear authenticity verdict.
              </p>

              <div className="hero-actions">
                <Link href="/upload" className="button button-primary">
                  Start Analysis
                  <ArrowRight size={16} />
                </Link>
                <Link href="/history" className="button button-secondary">
                  View History
                </Link>
              </div>
            </div>

            <aside
              className="surface compact-surface"
              style={{
                alignSelf: "center",
                padding: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: "min(38svh, 330px)",
                  minHeight: 250,
                  background: "#040b14",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <Image
                  src="/hud_scanner.png"
                  alt="Deepfake forensic scanner"
                  fill
                  priority
                  sizes="(max-width: 1060px) 100vw, 45vw"
                  style={{ objectFit: "cover", opacity: 0.84 }}
                />
                <span className="pill pill-accent" style={{ position: "absolute", top: 16, right: 16 }}>
                  Scanner online
                </span>
              </div>

              <div style={{ padding: 22 }}>
                <div style={{ fontWeight: 850, fontSize: "1rem" }}>
                  Image, audio, and video checks in one flow.
                </div>
                <p className="note" style={{ marginTop: 6 }}>
                  Results include risk, confidence, artifacts, and a certificate.
                </p>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}
