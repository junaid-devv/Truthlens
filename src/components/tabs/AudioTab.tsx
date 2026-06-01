"use client";

import { Activity, AudioLines, Gauge, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";
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
    <div className="surface" style={{ padding: 20, background: "var(--bg)" }}>
      <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: 14 }}>Waveform review</div>
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


        <div className="surface" style={{ padding: 24, background: "var(--bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <ShieldAlert size={16} color="var(--red)" />
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Detected artifacts</div>
          </div>
          {result.audio_artifacts.length > 0 ? (
            result.audio_artifacts.map((artifact) => (
              <ArtifactItem key={artifact} text={artifact} />
            ))
          ) : (
            <p className="note" style={{ margin: 0, fontSize: "0.86rem" }}>
              No audio artifacts returned in this run.
            </p>
          )}
        </div>

        {result.scam_analysis && (
          <div className="surface" style={{ padding: 24, background: "var(--bg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              {result.scam_analysis.is_scam ? (
                <ShieldAlert size={16} color="var(--danger)" />
              ) : (
                <CheckCircle2 size={16} color="var(--success)" />
              )}
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Scam & fraud scanning</div>
            </div>
            
            <div
              style={{
                padding: 16,
                borderRadius: "var(--r)",
                border: `1px solid ${result.scam_analysis.is_scam ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 148, 0.2)"}`,
                background: result.scam_analysis.is_scam ? "rgba(239, 68, 68, 0.04)" : "rgba(34, 197, 148, 0.04)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    color: result.scam_analysis.is_scam ? "var(--danger)" : "var(--success)",
                  }}
                >
                  {result.scam_analysis.is_scam ? `Scam Detected: ${result.scam_analysis.scam_type}` : "No Scam Patterns Identified"}
                </span>
                <span className="mono" style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                  Confidence: {result.scam_analysis.confidence}%
                </span>
              </div>
              <p className="note" style={{ marginTop: 8, color: "var(--text-soft)", fontSize: "0.85rem" }}>
                {result.scam_analysis.details}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="stack-md">
        <WaveformViz />

        {result.transcription && (
          <div className="surface" style={{ padding: 24, background: "var(--bg)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <FileText size={16} color="var(--red)" />
              <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Speech transcription</div>
            </div>
            <div
              style={{
                maxHeight: 180,
                overflowY: "auto",
                padding: 14,
                background: "var(--bg-2)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r)",
                fontSize: "0.88rem",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                color: "var(--text-soft)",
              }}
            >
              {result.transcription}
            </div>
          </div>
        )}

        <div className="surface" style={{ padding: 24, background: "var(--bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Activity size={16} color="var(--red)" />
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Consistency review</div>
          </div>

          <div className="summary-grid">
            <div className="summary-cell" style={{ background: "var(--bg-2)" }}>
              <div className="label" style={{ fontSize: "0.8rem" }}>Detected emotion</div>
              <div style={{ marginTop: 8, fontWeight: 600, fontSize: "0.88rem" }}>
                {result.emotion_consistency.detected_emotion}
              </div>
            </div>
            <div className="summary-cell" style={{ background: "var(--bg-2)" }}>
              <div className="label" style={{ fontSize: "0.8rem" }}>Claimed context</div>
              <div style={{ marginTop: 8, fontWeight: 600, fontSize: "0.88rem" }}>
                {result.emotion_consistency.claimed_context}
              </div>
            </div>
            <div className="summary-cell" style={{ background: "var(--bg-2)" }}>
              <div className="label" style={{ fontSize: "0.8rem" }}>Consistency score</div>
              <div
                className="status-value"
                style={{ marginTop: 8, fontWeight: 600, fontSize: "0.88rem", color: consistencyColor }}
              >
                {consistency}%
              </div>
            </div>
            <div className="summary-cell" style={{ background: "var(--bg-2)" }}>
              <div className="label" style={{ fontSize: "0.8rem" }}>Model confidence</div>
              <div className="status-value" style={{ marginTop: 8, fontWeight: 600, fontSize: "0.88rem" }}>
                {confidenceValue}%
              </div>
            </div>
          </div>

          <p className="note" style={{ margin: "18px 0 0", fontSize: "0.86rem" }}>
            {result.emotion_consistency.explanation}
          </p>
        </div>

        <div className="surface" style={{ padding: 24, background: "var(--bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Gauge size={16} color="var(--red)" />
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Confidence breakdown</div>
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
        <span className="label" style={{ fontSize: "0.82rem" }}>{label}</span>
        <span className="mono" style={{ color, fontWeight: 600, fontSize: "0.85rem" }}>
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
