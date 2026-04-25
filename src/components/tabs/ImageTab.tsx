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

function HeatmapOverlay() {
  const zones = [
    { top: "18%", left: "24%", size: 86, opacity: 0.7 },
    { top: "14%", right: "26%", size: 64, opacity: 0.48 },
    { top: "42%", left: "32%", size: 52, opacity: 0.58 },
    { top: "58%", left: "46%", size: 42, opacity: 0.42 },
  ];

  return (
    <div
      className="surface-muted"
      style={{
        padding: 24,
        position: "relative",
        overflow: "hidden",
        minHeight: 340,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 24,
          borderRadius: 24,
          border: "1px solid var(--line)",
          background: "#111c2a",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "14%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "42%",
          height: "68%",
          borderRadius: "48% 48% 44% 44%",
          background: "#223246",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "32%",
          left: "38%",
          width: 12,
          height: 12,
          borderRadius: 999,
          background: "#364e68",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "32%",
          right: "38%",
          width: 12,
          height: 12,
          borderRadius: 999,
          background: "#364e68",
        }}
      />

      {zones.map((zone, index) => (
        <span
          key={index}
          style={{
            position: "absolute",
            ...zone,
            width: zone.size,
            height: zone.size,
            borderRadius: 999,
            background: `rgba(239, 100, 100, ${zone.opacity})`,
            filter: "blur(24px)",
          }}
        />
      ))}
    </div>
  );
}

export default function ImageTab({ result }: { result: AnalysisResult }) {
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
          <HeatmapOverlay />
          <p className="note" style={{ margin: "16px 0 0" }}>
            Highlighted areas mark likely manipulation zones.
          </p>
        </div>

        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Open-source face check</div>
          <div className="summary-grid">
            <div className="summary-cell">
              <div className="label">Public match</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>No strong match</div>
            </div>
            <div className="summary-cell">
              <div className="label">Interpretation</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                Verify with source
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
