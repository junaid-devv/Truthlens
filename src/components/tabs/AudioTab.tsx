"use client";

import { Activity, CheckCircle2, FileText, ShieldAlert } from "lucide-react";
import { AnalysisResult } from "@/lib/types";

function ArtifactItem({ text }: { text: string }) {
  return (
    <div className="artifact-item">
      <span className="artifact-dot" />
      <span>{text}</span>
    </div>
  );
}

export default function AudioTab({ result }: { result: AnalysisResult }) {
  const consistency = result.emotion_consistency.consistency_score;
  const consistencyColor =
    consistency < 40
      ? "var(--danger)"
      : consistency < 70
        ? "var(--warning)"
        : "var(--success)";

  return (
    <div className="section-grid-2">
      <div className="stack-md">
        <div className="surface-muted" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <ShieldAlert size={18} color="var(--accent-2)" />
            <div style={{ fontWeight: 850 }}>Audio artifacts</div>
          </div>
          {result.audio_artifacts.length > 0 ? (
            result.audio_artifacts.map((artifact) => (
              <ArtifactItem key={artifact} text={artifact} />
            ))
          ) : (
            <p className="note">No audio artifacts were returned for this run.</p>
          )}
        </div>

        {result.scam_analysis && (
          <div className="surface-muted" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              {result.scam_analysis.is_scam ? (
                <ShieldAlert size={18} color="var(--danger)" />
              ) : (
                <CheckCircle2 size={18} color="var(--success)" />
              )}
              <div
                style={{
                  fontWeight: 850,
                  color: result.scam_analysis.is_scam
                    ? "var(--danger)"
                    : "var(--success)",
                }}
              >
                {result.scam_analysis.is_scam
                  ? `Scam detected: ${result.scam_analysis.scam_type}`
                  : "No scam pattern detected"}
              </div>
            </div>
            <div className="summary-grid" style={{ marginBottom: 14 }}>
              <div className="summary-cell">
                <div className="label">Confidence</div>
                <div className="status-value" style={{ marginTop: 8, fontWeight: 850 }}>
                  {result.scam_analysis.confidence}%
                </div>
              </div>
              <div className="summary-cell">
                <div className="label">Type</div>
                <div style={{ marginTop: 8, fontWeight: 850 }}>
                  {result.scam_analysis.scam_type || "None"}
                </div>
              </div>
            </div>
            <p className="note">{result.scam_analysis.details}</p>
          </div>
        )}
      </div>

      <div className="stack-md">
        {result.transcription && (
          <div className="surface-muted" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <FileText size={18} color="var(--accent-2)" />
              <div style={{ fontWeight: 850 }}>Speech transcript</div>
            </div>
            <div
              style={{
                maxHeight: 190,
                overflowY: "auto",
                padding: 14,
                background: "rgba(6,17,29,0.72)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r)",
                whiteSpace: "pre-wrap",
              }}
            >
              {result.transcription}
            </div>
          </div>
        )}

        <div className="surface-muted" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Activity size={18} color="var(--accent-2)" />
            <div style={{ fontWeight: 850 }}>Emotion and context</div>
          </div>

          <div className="summary-grid">
            <div className="summary-cell">
              <div className="label">Detected emotion</div>
              <div style={{ marginTop: 8, fontWeight: 850 }}>
                {result.emotion_consistency.detected_emotion}
              </div>
            </div>
            <div className="summary-cell">
              <div className="label">Claimed context</div>
              <div style={{ marginTop: 8, fontWeight: 850 }}>
                {result.emotion_consistency.claimed_context}
              </div>
            </div>
            <div className="summary-cell">
              <div className="label">Consistency</div>
              <div
                className="status-value"
                style={{ marginTop: 8, fontWeight: 850, color: consistencyColor }}
              >
                {consistency}%
              </div>
            </div>
            <div className="summary-cell">
              <div className="label">Label</div>
              <div style={{ marginTop: 8, fontWeight: 850 }}>
                {result.emotion_consistency.consistency_label}
              </div>
            </div>
          </div>

          <p className="note" style={{ marginTop: 16 }}>
            {result.emotion_consistency.explanation}
          </p>
        </div>
      </div>
    </div>
  );
}
