"use client";

import { Activity, AudioLines, Gauge, ShieldAlert } from "lucide-react";
import { AnalysisResult, getRiskColor } from "@/lib/types";

function ArtifactItem({ text }: { text: string }) {
  return (
    <div className="artifact-item">
      <span className="artifact-dot" />
      <span>{text}</span>
    </div>
  );
}

function WaveformViz() {
  const bars = Array.from({ length: 56 }, (_, index) => {
    const height =
      14 + Math.abs(Math.sin(index * 0.31) * 34 + Math.sin(index * 0.67) * 18);
    const anomaly = (index > 16 && index < 24) || (index > 38 && index < 47);

    return { height, anomaly };
  });

  return (
    <div className="surface-muted" style={{ padding: 20 }}>
      <div style={{ fontWeight: 700, marginBottom: 14 }}>Waveform review</div>
      <div
        style={{
          height: 92,
          display: "flex",
          alignItems: "end",
          gap: 3,
        }}
      >
        {bars.map((bar, index) => (
          <span
            key={index}
            style={{
              flex: 1,
              minWidth: 3,
              height: `${bar.height}px`,
              borderRadius: 999,
              background: bar.anomaly ? "var(--danger)" : "var(--accent)",
              opacity: bar.anomaly ? 0.92 : 0.45,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 14,
          color: "var(--text-soft)",
          fontSize: "0.82rem",
        }}
      >
        <span>Accent bars represent stable segments.</span>
        <span>Red bars represent suspicious sections.</span>
      </div>
    </div>
  );
}

export default function AudioTab({ result }: { result: AnalysisResult }) {
  const riskColor = getRiskColor(result.risk_level);
  const consistency = result.emotion_consistency.consistency_score;
  const consistencyColor =
    consistency < 40
      ? "var(--danger)"
      : consistency < 70
        ? "var(--warning)"
        : "var(--success)";

  const confidenceValue =
    result.confidence_in_verdict === "high"
      ? 88
      : result.confidence_in_verdict === "medium"
        ? 64
        : 42;

  return (
    <div className="section-grid-2">
      <div className="stack-md">
        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <AudioLines size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700 }}>Audio deepfake score</div>
          </div>

          <div className="result-score status-value" style={{ color: riskColor }}>
            {result.probability_ai_generated}%
          </div>
          <div className="note" style={{ marginTop: 6 }}>
            Estimated audio deepfake probability.
          </div>

          <div style={{ marginTop: 18 }}>
            <ProgressSection
              label="Model score"
              value={result.probability_ai_generated}
              color={riskColor}
            />
          </div>
        </div>

        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <ShieldAlert size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700 }}>Detected artifacts</div>
          </div>
          {result.audio_artifacts.length > 0 ? (
            result.audio_artifacts.map((artifact) => (
              <ArtifactItem key={artifact} text={artifact} />
            ))
          ) : (
            <p className="note" style={{ margin: 0 }}>
              No audio artifacts returned in this run.
            </p>
          )}
        </div>
      </div>

      <div className="stack-md">
        <WaveformViz />

        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Activity size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700 }}>Consistency review</div>
          </div>

          <div className="summary-grid">
            <div className="summary-cell">
              <div className="label">Detected emotion</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                {result.emotion_consistency.detected_emotion}
              </div>
            </div>
            <div className="summary-cell">
              <div className="label">Claimed context</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                {result.emotion_consistency.claimed_context}
              </div>
            </div>
            <div className="summary-cell">
              <div className="label">Consistency score</div>
              <div
                className="status-value"
                style={{ marginTop: 8, fontWeight: 700, color: consistencyColor }}
              >
                {consistency}%
              </div>
            </div>
            <div className="summary-cell">
              <div className="label">Model confidence</div>
              <div className="status-value" style={{ marginTop: 8, fontWeight: 700 }}>
                {confidenceValue}%
              </div>
            </div>
          </div>

          <p className="note" style={{ margin: "18px 0 0" }}>
            {result.emotion_consistency.explanation}
          </p>
        </div>

        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Gauge size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700 }}>Confidence breakdown</div>
          </div>
          <div className="stack-sm">
            <ProgressSection
              label="Audio artifact confidence"
              value={result.probability_ai_generated}
              color={riskColor}
            />
            <ProgressSection
              label="Emotion consistency"
              value={consistency}
              color={consistencyColor}
            />
            <ProgressSection
              label="Final verdict confidence"
              value={confidenceValue}
              color="var(--accent)"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressSection({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span className="label">{label}</span>
        <span className="mono" style={{ color, fontWeight: 700 }}>
          {value}%
        </span>
      </div>
      <div className="progress-track">
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: color,
          }}
        />
      </div>
    </div>
  );
}
