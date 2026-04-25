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
    description: "Voice cloning and synthetic timbre checks.",
    status: "Active",
  },
  {
    icon: ImageIcon,
    title: "Image verification",
    description: "Artifact and lighting consistency checks.",
    status: "Ready",
  },
  {
    icon: Video,
    title: "Video analysis",
    description: "Frame continuity and audio-visual mismatch checks.",
    status: "Ready",
  },
];

const workflow = [
  {
    title: "Upload suspicious media",
    copy: "Audio, image, or video. The app routes to the correct checks.",
  },
  {
    title: "Run forensic analysis",
    copy: "Signal and consistency checks run as a single pipeline.",
  },
  {
    title: "Export decision proof",
    copy: "Receive a risk verdict, evidence summary, and certificate.",
  },
];

const useCases = [
  {
    title: "Fraud response",
    copy: "Validate suspicious calls and forwarded media quickly.",
  },
  {
    title: "Newsroom checks",
    copy: "Screen user-generated content before publication.",
  },
  {
    title: "Operations",
    copy: "Create shareable proof for internal and external review.",
  },
];

export default function HomePage() {
  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container stack-lg">
          <section className="hero-grid fade-in">
            <div>
              <span className="eyebrow">Voice, image, and video verification</span>
              <h1 className="page-title">
                Verify suspicious media before it can harm you.
              </h1>
              <p className="page-subtitle">
                One focused workflow from upload to verdict, with evidence you
                can act on.
              </p>

              <div className="hero-actions">
                <Link href="/upload" className="button button-primary">
                  Start Analysis
                  <ArrowRight size={18} />
                </Link>
                <Link href="/history" className="button button-secondary">
                  View History
                </Link>
              </div>

              <div className="metric-grid hero-metrics">
                <div className="metric-item">
                  <div className="metric-value">&lt;25s</div>
                  <div className="metric-label">Typical turnaround</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">9</div>
                  <div className="metric-label">Models in stack</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">3</div>
                  <div className="metric-label">Media modes</div>
                </div>
                <div className="metric-item">
                  <div className="metric-value">On-device</div>
                  <div className="metric-label">Privacy first</div>
                </div>
              </div>
            </div>

            <aside className="surface" style={{ padding: 28 }}>
              <div className="stack-md">
                <div className="stack-sm">
                  <span className="eyebrow">Detection stack</span>
                </div>

                <div className="stack-sm">
                  {detectionStack.map((item, index) => (
                    <div
                      key={item.title}
                      className={`signal-row${index === 0 ? " is-emphasis" : ""}`}
                    >
                      <span className="signal-icon">
                        <item.icon
                          size={22}
                          color={index === 0 ? "var(--accent)" : "var(--text-dim)"}
                        />
                      </span>
                      <div>
                        <div style={{ fontWeight: 700 }}>{item.title}</div>
                        <div className="note" style={{ fontSize: "0.92rem" }}>
                          {item.description}
                        </div>
                      </div>
                      <span
                        className={`pill ${
                          index === 0 ? "pill-accent" : "pill-success"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="section-divider" />

                <div className="signal-row">
                  <span className="signal-icon">
                    <FileCheck2 size={20} color="var(--accent)" />
                  </span>
                  <div>
                    <div style={{ fontWeight: 700 }}>Certificate output</div>
                    <div className="note" style={{ fontSize: "0.92rem" }}>
                      Shareable verdict and supporting evidence.
                    </div>
                  </div>
                  <span className="pill pill-success">Included</span>
                </div>
              </div>
            </aside>
          </section>

          <section id="workflow" className="stack-lg">
            <div className="page-intro">
              <span className="eyebrow">How it works</span>
              <h2 className="section-title">Three steps. One clear verdict.</h2>
            </div>

            <div className="surface" style={{ padding: "8px 28px" }}>
              {workflow.map((item, index) => (
                <div key={item.title} className="definition-row">
                  <div>
                    <div className="label">Step {index + 1}</div>
                    <div style={{ marginTop: 8, fontSize: "1.15rem", fontWeight: 700 }}>
                      {item.title}
                    </div>
                  </div>
                  <p className="note" style={{ margin: 0 }}>
                    {item.copy}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="stack-lg">
            <div className="page-intro">
              <span className="eyebrow">Use cases</span>
              <h2 className="section-title">Built for real verification work.</h2>
            </div>

            <div className="section-grid-3">
              {useCases.map((item) => (
                <div key={item.title} className="surface-muted" style={{ padding: 24 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
                    <span className="signal-icon" style={{ width: 44, height: 44 }}>
                      {item.title === "Fraud response" && (
                        <ShieldCheck size={20} color="var(--accent)" />
                      )}
                      {item.title === "Newsroom checks" && (
                        <ScanSearch size={20} color="var(--accent)" />
                      )}
                      {item.title === "Operations" && (
                        <FileCheck2 size={20} color="var(--accent)" />
                      )}
                    </span>
                    <div style={{ fontWeight: 700 }}>{item.title}</div>
                  </div>
                  <p className="note" style={{ margin: 0 }}>
                    {item.copy}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="surface" style={{ padding: 32 }}>
            <div className="workspace-grid" style={{ alignItems: "center" }}>
              <div className="stack-sm">
                <span className="eyebrow">Ready</span>
                <h2 className="section-title">Start your analysis now.</h2>
                <p className="note" style={{ margin: 0 }}>
                  Upload media, run the stack, and get a verdict you can trust.
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-start", gap: 12 }}>
                <Link href="/upload" className="button button-primary">
                  Open Analyzer
                </Link>
              </div>
            </div>
          </section>

          <footer
            className="section-divider"
            style={{
              paddingTop: 28,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <BrandMark compact />
            <div
              style={{
                display: "flex",
                gap: 18,
                flexWrap: "wrap",
                color: "var(--text-soft)",
              }}
            >
              <span>Voice, image, video checks</span>
              <span>Evidence-backed certificates</span>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
