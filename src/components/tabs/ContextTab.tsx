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
          ? "#d0d660"
          : "var(--success)";

  const secondaryScores = classification.key_entities
    .filter((entity) => entity !== classification.likely_type)
    .slice(0, 4)
    .map((entity, index) => ({
      label: entity,
      value: Math.max(Math.round(classification.confidence * (0.46 - index * 0.08)), 4),
    }));

  return (
    <div className="section-grid-2">
      <div className="stack-md">
        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Network size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700 }}>Classification result</div>
          </div>

          <div className="summary-grid">
            <div className="summary-cell">
              <div className="label">Likely type</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                {classification.likely_type}
              </div>
            </div>
            <div className="summary-cell">
              <div className="label">Confidence</div>
              <div className="status-value" style={{ marginTop: 8, fontWeight: 700 }}>
                {classification.confidence}%
              </div>
            </div>
            <div className="summary-cell">
              <div className="label">Claimed context</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                {result.emotion_consistency.claimed_context}
              </div>
            </div>
            <div className="summary-cell">
              <div className="label">Matched scenario</div>
              <div style={{ marginTop: 8, fontWeight: 700 }}>
                {classification.matched_scenario}
              </div>
            </div>
          </div>

          <div className="surface" style={{ padding: 18, marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <AlertTriangle
                size={18}
                color={contradictionColor}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <div style={{ fontWeight: 700, color: contradictionColor }}>
                  Contradiction level: {classification.contradiction_level}
                </div>
                <p className="note" style={{ margin: "8px 0 0" }}>
                  Measures mismatch between content and claimed scenario.
                </p>
              </div>
            </div>
          </div>
        </div>

        {result.scam_analysis && result.scam_analysis.is_scam && (
          <div className="surface-muted" style={{ padding: 24, border: "1px solid rgba(239, 68, 68, 0.25)", background: "rgba(239, 68, 68, 0.03)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <AlertTriangle size={18} color="var(--danger)" />
              <div style={{ fontWeight: 700, color: "var(--danger)" }}>Scam / Fraud Detected</div>
            </div>
            
            <div className="summary-grid" style={{ marginBottom: 16 }}>
              <div className="summary-cell">
                <div className="label">Scam type</div>
                <div style={{ marginTop: 8, fontWeight: 700, color: "var(--danger)" }}>
                  {result.scam_analysis.scam_type}
                </div>
              </div>
              <div className="summary-cell">
                <div className="label">Analysis confidence</div>
                <div style={{ marginTop: 8, fontWeight: 700 }}>
                  {result.scam_analysis.confidence}%
                </div>
              </div>
            </div>
            <p className="note" style={{ margin: 0, color: "var(--text-soft)" }}>
              {result.scam_analysis.details}
            </p>
          </div>
        )}

        {result.scam_analysis && !result.scam_analysis.is_scam && (
          <div className="surface-muted" style={{ padding: 24, border: "1px solid rgba(34, 197, 94, 0.2)", background: "rgba(34, 197, 94, 0.02)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Shield size={18} color="var(--success)" />
              <div style={{ fontWeight: 700, color: "var(--success)" }}>Scam Scan Clean</div>
            </div>
            <p className="note" style={{ margin: 0, color: "var(--text-soft)" }}>
              No phishing, social engineering, or fraudulent speech patterns were identified in this media file.
            </p>
          </div>
        )}

        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Quote size={18} color="var(--accent)" />
            <div style={{ fontWeight: 700 }}>Suggested scenario</div>
          </div>
          <p className="note" style={{ margin: 0 }}>
            {result.suggested_scenario}
          </p>
        </div>
      </div>

      <div className="stack-md">
        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Key entities</div>
          {classification.key_entities.map((entity) => (
            <div key={entity} className="artifact-item">
              <span className="artifact-dot" />
              <span>{entity}</span>
            </div>
          ))}
        </div>

        <div className="surface-muted" style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Score spread</div>
          <div className="stack-sm">
            <ScoreBar
              label={classification.likely_type}
              value={classification.confidence}
              color="var(--accent)"
            />
            {secondaryScores.map((item) => (
              <ScoreBar
                key={item.label}
                label={item.label}
                value={item.value}
                color="var(--text-dim)"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({
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
        <span className="mono" style={{ fontWeight: 700 }}>
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
