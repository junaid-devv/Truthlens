"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, Shield } from "lucide-react";
import { AnalysisResult, getRiskColor, getVerdictColor } from "@/lib/types";

export default function ReportTab({ result }: { result: AnalysisResult }) {
  const riskColor = getRiskColor(result.risk_level);
  const verdictColor = getVerdictColor(result.overall_verdict);
  const isFake =
    result.overall_verdict === "FAKE" || result.overall_verdict === "LIKELY_FAKE";

  return (
    <div className="stack-lg" style={{ maxWidth: 920 }}>
      <div className="surface-muted" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          {isFake ? (
            <AlertTriangle size={18} color={riskColor} />
          ) : (
            <CheckCircle2 size={18} color="var(--success)" />
          )}
          <div style={{ fontWeight: 700 }}>Plain-language verdict</div>
        </div>
        <p className="note" style={{ margin: 0 }}>
          {result.plain_language_explanation}
        </p>
      </div>

      <div className="surface-muted" style={{ padding: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 14, color: riskColor }}>
          Final decision
        </div>
        <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>
          {result.verdict_sentence}
        </div>
      </div>

      <div className="surface-muted" style={{ padding: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 14 }}>Recommended action</div>
        <p className="note" style={{ margin: 0 }}>
          {result.recommended_action}
        </p>
      </div>

      <div className="surface-muted" style={{ padding: 24 }}>
        <div style={{ fontWeight: 700, marginBottom: 16 }}>Summary</div>
        <div className="summary-grid">
          <Cell label="File" value={result.fileName} />
          <Cell label="Analysis ID" value={result.analysisId} mono />
          <Cell
            label="Overall verdict"
            value={result.overall_verdict}
            color={verdictColor}
          />
          <Cell label="Risk level" value={result.risk_level} color={riskColor} />
          <Cell
            label="AI probability"
            value={`${result.probability_ai_generated}%`}
            color={riskColor}
          />
          <Cell label="Confidence" value={result.confidence_in_verdict} />
          <Cell
            label="Audio artifacts"
            value={`${result.audio_artifacts.length} detected`}
          />
          <Cell
            label="Image artifacts"
            value={
              result.image_artifacts.length > 0
                ? `${result.image_artifacts.length} detected`
                : "Not returned"
            }
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/certificate" className="button button-primary">
          <Download size={16} />
          Download Certificate
        </Link>
        <Link href="/upload" className="button button-secondary">
          <Shield size={16} />
          Analyze Another File
        </Link>
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  color,
  mono = false,
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
}) {
  return (
    <div className="summary-cell">
      <div className="label">{label}</div>
      <div
        className={mono ? "mono" : undefined}
        style={{
          marginTop: 8,
          fontWeight: 700,
          color: color || "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}
