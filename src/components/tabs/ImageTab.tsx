"use client";

import Image from "next/image";
import { Camera, Image as ImageIcon, SearchCheck } from "lucide-react";
import { AnalysisResult } from "@/lib/types";

type HeatmapZone = NonNullable<
  NonNullable<AnalysisResult["face_check"]>["heatmap_zones"]
>[number];

function ArtifactItem({ text }: { text: string }) {
  return (
    <div className="artifact-item">
      <span className="artifact-dot" />
      <span>{text}</span>
    </div>
  );
}

function MediaPreview({
  zones,
  imageUrl,
  isVideo,
}: {
  zones: HeatmapZone[];
  imageUrl?: string | null;
  isVideo?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        height: 300,
        border: "1px solid var(--line)",
        borderRadius: "var(--r)",
        background: "rgba(6,17,29,0.72)",
        overflow: "hidden",
      }}
    >
      {imageUrl ? (
        isVideo ? (
          <video
            src={imageUrl}
            style={{ width: "100%", height: 300, objectFit: "contain", opacity: 0.72 }}
            muted
            autoPlay
            loop
            playsInline
          />
        ) : (
          <Image
            src={imageUrl}
            alt="Analyzed media"
            fill
            sizes="(max-width: 900px) 100vw, 50vw"
            unoptimized
            style={{ objectFit: "contain", opacity: 0.72 }}
          />
        )
      ) : (
        <div
          className="note"
          style={{
            height: 300,
            display: "grid",
            placeItems: "center",
          }}
        >
          Original media unavailable
        </div>
      )}

      {zones.map((zone, index) => (
        <span
          key={index}
          aria-hidden="true"
          style={{
            position: "absolute",
            top: zone.top,
            left: zone.left,
            right: zone.right,
            width: zone.size,
            height: zone.size,
            borderRadius: 999,
            border: "2px solid var(--danger)",
            background: "rgba(255, 92, 92, 0.18)",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}

export default function ImageTab({
  result,
  imageUrl,
}: {
  result: AnalysisResult;
  imageUrl?: string | null;
}) {
  const isVideo = result.fileType === "video";
  const artifacts = result.visual_artifacts?.length
    ? result.visual_artifacts
    : result.image_artifacts;
  const hasVisualData = artifacts.length > 0 || (isVideo && result.video_visual);

  return (
    <div className="section-grid-2">
      <div className="stack-md">
        <div className="surface-muted" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <SearchCheck size={18} color="var(--accent-2)" />
            <div style={{ fontWeight: 850 }}>Visual artifacts</div>
          </div>
          {hasVisualData ? (
            artifacts.map((artifact) => <ArtifactItem key={artifact} text={artifact} />)
          ) : (
            <p className="note">No image-specific artifacts were returned.</p>
          )}
        </div>

        {result.image_models && (
          <div className="surface-muted" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <ImageIcon size={18} color="var(--accent-2)" />
              <div style={{ fontWeight: 850 }}>Model checks</div>
            </div>
            <div className="data-list">
              {result.image_models.map((m) => {
                const color =
                  m.verdict === "FAKE"
                    ? "var(--danger)"
                    : m.verdict === "REAL"
                      ? "var(--success)"
                      : "var(--text-2)";
                const status = m.ran
                  ? `${m.confidence}% ${m.verdict ?? "UNKNOWN"}`
                  : m.rawLabel === "NO_FACE_DETECTED"
                    ? "Skipped"
                    : m.rawLabel?.includes("ERROR")
                      ? "Error"
                      : "Unavailable";
                return (
                  <div key={m.modelId} className="data-row">
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 750 }}>{m.model}</span>
                      <span className="mono label">{m.modelId}</span>
                      {!m.ran && m.rawLabel && (
                        <span className="mono label" style={{ display: "block", marginTop: 4, overflowWrap: "anywhere" }}>
                          {m.rawLabel}
                        </span>
                      )}
                    </span>
                    <span className="value" style={{ color }}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="stack-md">
        <div className="surface-muted" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Camera size={18} color="var(--accent-2)" />
            <div style={{ fontWeight: 850 }}>Media review</div>
          </div>
          <MediaPreview
            zones={result.face_check?.heatmap_zones || []}
            imageUrl={imageUrl}
            isVideo={isVideo}
          />
          <p className="note" style={{ marginTop: 12 }}>
            Marked areas indicate regions the analysis flagged for closer review.
          </p>
        </div>

        <div className="surface-muted" style={{ padding: 22 }}>
          <div style={{ fontWeight: 850, marginBottom: 14 }}>Source risk check</div>
          <div className="summary-grid">
            <div className="summary-cell">
              <div className="label">Identity status</div>
              <div style={{ marginTop: 8, fontWeight: 850 }}>
                {result.face_check?.match || "Identity not verified"}
              </div>
            </div>
            <div className="summary-cell">
              <div className="label">Interpretation</div>
              <div style={{ marginTop: 8, fontWeight: 850 }}>
                {result.face_check?.interpretation || "Verify with source"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
