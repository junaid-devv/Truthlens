"use client";

import { AlertTriangle, Network, Quote, Shield } from "lucide-react";
import { AnalysisResult } from "@/lib/types";

export default function ContextTab({ result }: { result: AnalysisResult }) {
  const classification = result.content_classification;
  const contradictionColor =
    classification.contradiction_level === "high"
      ? "var(--danger)"
      : classification.contradiction_level === "medium"
        ? "var(--warning)"
        : classification.contradiction_level === "low"
          ? "var(--warning)"
          : "var(--success)";

  return (
    <div className="section-grid-2">
      <div className="surface-muted" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Network size={18} color="var(--accent-2)" />
          <div style={{ fontWeight: 850 }}>Context classification</div>
        </div>

        <div className="summary-grid">
          <div className="summary-cell">
            <div className="label">Likely type</div>
            <div style={{ marginTop: 8, fontWeight: 850 }}>
              {classification.likely_type || "Not classified"}
            </div>
          </div>
          <div className="summary-cell">
            <div className="label">Confidence</div>
            <div className="status-value" style={{ marginTop: 8, fontWeight: 850 }}>
              {classification.confidence}%
            </div>
          </div>
          <div className="summary-cell">
            <div className="label">Matched scenario</div>
            <div style={{ marginTop: 8, fontWeight: 850 }}>
              {classification.matched_scenario}
            </div>
          </div>
          <div className="summary-cell">
            <div className="label">Claimed context</div>
            <div style={{ marginTop: 8, fontWeight: 850 }}>
              {result.emotion_consistency.claimed_context}
            </div>
          </div>
        </div>
      </div>

      <div className="stack-md">
        <div className="surface-muted" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <AlertTriangle
              size={18}
              color={contradictionColor}
              style={{ marginTop: 2, flexShrink: 0 }}
            />
            <div>
              <div style={{ fontWeight: 850, color: contradictionColor }}>
                Contradiction level: {classification.contradiction_level}
              </div>
              <p className="note" style={{ marginTop: 8 }}>
                Indicates whether the detected content conflicts with the
                claimed scenario or emotional context.
              </p>
            </div>
          </div>
        </div>

        {result.scam_analysis && (
          <div className="surface-muted" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              {result.scam_analysis.is_scam ? (
                <AlertTriangle size={18} color="var(--danger)" />
              ) : (
                <Shield size={18} color="var(--success)" />
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
                  ? `Scam pattern: ${result.scam_analysis.scam_type}`
                  : "No scam pattern detected"}
              </div>
            </div>
            <p className="note">{result.scam_analysis.details}</p>
          </div>
        )}

        <div className="surface-muted" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Quote size={18} color="var(--accent-2)" />
            <div style={{ fontWeight: 850 }}>Suggested scenario</div>
          </div>
          <p className="note">{result.suggested_scenario}</p>
        </div>
      </div>
    </div>
  );
}
