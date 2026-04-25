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
      className="surface-muted"
      style={{
        padding: 24,
        position: "relative",
        minHeight: 340,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
  const visualScore = hasVisualData
    ? Math.max(result.probability_ai_generated - 5, 0)
    : 0;
  const riskColor = getRiskColor(result.risk_level);

  return (
    <div className="section-grid-2">
      <div className="stack-md">
        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <ImageIcon size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700 }}>
              {isVideo ? "Video visual analysis" : "Image deepfake score"}
            </div>
          </div>

          {hasVisualData ? (
            <>
              <div className="result-score status-value" style={{ color: riskColor }}>
                {visualScore}%
              </div>
              <p className="note" style={{ margin: "8px 0 0" }}>
                Estimated visual manipulation probability.
              </p>
              <div style={{ marginTop: 18 }}>
                <div className="progress-track">
                  <div
                    style={{
                      width: `${visualScore}%`,
                      height: "100%",
                      background: riskColor,
                    }}
                  />
                </div>
              </div>
              {isVideo && result.video_visual && (
                <div className="surface" style={{ padding: 18, marginTop: 18 }}>
                  <div className="label">Visual verdict</div>
                  <div style={{ marginTop: 8, fontWeight: 700 }}>
                    {result.video_visual.verdict}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="note" style={{ margin: 0 }}>
              No visual analysis was returned for this run.
            </p>
          )}
        </div>

        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <SearchCheck size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700 }}>Detected visual artifacts</div>
          </div>
          {hasVisualData ? (
            artifacts.map((artifact) => <ArtifactItem key={artifact} text={artifact} />)
          ) : (
            <p className="note" style={{ margin: 0 }}>
              There are no image-specific artifacts to display.
            </p>
          )}
        </div>
      </div>

      <div className="stack-md">
        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Camera size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700 }}>Heatmap view</div>
          </div>
          <HeatmapOverlay zones={result.face_check?.heatmap_zones || []} imageUrl={imageUrl} />
          <p className="note" style={{ margin: "16px 0 0" }}>
            Highlighted areas mark likely manipulation zones.
          </p>
        </div>

        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Open-source face check</div>
          <div className="summary-grid">
            <div className="summary-cell">
              <div className="label">Public match</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>{result.face_check?.match || "No strong match"}</div>
            </div>
            <div className="summary-cell">
              <div className="label">Interpretation</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                {result.face_check?.interpretation || "Verify with source"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
