"use client";

import { Camera, Image as ImageIcon, SearchCheck } from "lucide-react";
import { AnalysisResult, getRiskColor } from "@/lib/types";

function ArtifactItem({ text }: { text: string }) {
  return (
    <div className="artifact-item">
      <span className="artifact-dot" />
      <span>{text}</span>
    </div>
  );
}

function HeatmapOverlay({ zones, imageUrl, isVideo }: { zones: any[], imageUrl?: string | null, isVideo?: boolean }) {
  return (
    <div
      className="surface"
      style={{
        padding: 24,
        position: "relative",
        minHeight: 340,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 24,
          borderRadius: 24,
          border: "1px solid var(--line)",
          background: "#111c2a",
          overflow: "hidden",
        }}
      >
        {imageUrl ? (
          isVideo ? (
            <video
              src={imageUrl}
              style={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.6 }}
              muted
              autoPlay
              loop
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Analysis subject" style={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.6 }} />
          )
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              fontStyle: "italic",
              background: "var(--surface-muted)",
              zIndex: 0,
            }}
          >
            Original media unavailable
          </div>
        )}

        {zones.map((zone, index) => (
          <span
            key={index}
            style={{
              position: "absolute",
              top: zone.top,
              left: zone.left,
              right: zone.right,
              width: zone.size,
              height: zone.size,
              borderRadius: 999,
              background: `rgba(239, 100, 100, ${zone.opacity || 0.6})`,
              filter: "blur(24px)",
              pointerEvents: "none",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ImageTab({ result, imageUrl }: { result: AnalysisResult; imageUrl?: string | null }) {
  const isVideo = result.fileType === "video";
  const artifacts = result.visual_artifacts?.length
    ? result.visual_artifacts
    : result.image_artifacts;
  const hasVisualData = artifacts.length > 0 || (isVideo && result.video_visual);

  return (
    <div className="section-grid-2">
      <div className="stack-md">

        <div className="surface" style={{ padding: 24, background: "var(--bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <SearchCheck size={16} color="var(--red)" />
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Detected visual artifacts</div>
          </div>
          {hasVisualData ? (
            artifacts.map((artifact) => <ArtifactItem key={artifact} text={artifact} />)
          ) : (
            <p className="note" style={{ margin: 0, fontSize: "0.86rem" }}>
              There are no image-specific artifacts to display.
            </p>
          )}
        </div>

        {result.image_models && (
          <div className="surface" style={{ padding: 24, background: "var(--bg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <ImageIcon size={16} color="var(--red)" />
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Sub-model pipeline details</div>
            </div>
            <div className="stack-sm">
              {result.image_models.map((m) => {
                const modelVerdictColor =
                  m.verdict === "FAKE"
                    ? "var(--danger)"
                    : m.verdict === "REAL"
                      ? "var(--success)"
                      : "var(--text-soft)";
                return (
                  <div
                    key={m.modelId}
                    style={{
                      padding: 14,
                      background: "var(--bg-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{m.model}</div>
                        <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-dim)", marginTop: 2 }}>
                          {m.modelId}
                        </div>
                      </div>
                      <span
                        className="mono"
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: m.ran ? (m.verdict === "FAKE" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)") : "rgba(148,163,184,0.1)",
                          color: modelVerdictColor,
                        }}
                      >
                        {m.ran ? (m.verdict === "FAKE" ? "AI Generated" : "Authentic") : "OFFLINE"}
                      </span>
                    </div>

                    {m.ran && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.82rem",
                          marginTop: 4,
                        }}
                      >
                        <span style={{ color: "var(--text-soft)" }}>Confidence score:</span>
                        <span className="mono" style={{ fontWeight: 600, color: modelVerdictColor }}>
                          {m.confidence}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="stack-md">
        <div className="surface" style={{ padding: 24, background: "var(--bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Camera size={16} color="var(--red)" />
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Heatmap view</div>
          </div>
          <HeatmapOverlay zones={result.face_check?.heatmap_zones || []} imageUrl={imageUrl} />
          <p className="note" style={{ margin: "14px 0 0", fontSize: "0.86rem" }}>
            Highlighted areas mark likely manipulation zones.
          </p>
        </div>

        <div className="surface" style={{ padding: 24, background: "var(--bg)" }}>
          <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 16 }}>Open-source face check</div>
          <div className="summary-grid">
            <div className="summary-cell" style={{ background: "var(--bg-2)" }}>
              <div className="label" style={{ fontSize: "0.8rem" }}>Public match</div>
              <div style={{ marginTop: 8, fontWeight: 600, fontSize: "0.88rem" }}>{result.face_check?.match || "No strong match"}</div>
            </div>
            <div className="summary-cell" style={{ background: "var(--bg-2)" }}>
              <div className="label" style={{ fontSize: "0.8rem" }}>Interpretation</div>
              <div style={{ marginTop: 8, fontWeight: 600, fontSize: "0.88rem" }}>
                {result.face_check?.interpretation || "Verify with source"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
