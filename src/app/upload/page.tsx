"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileAudio,
  FileImage,
  FileVideo,
  Image as ImageIcon,
  LockKeyhole,
  Mic,
  Upload,
  Video,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const mediaTypes = [
  {
    id: "audio",
    icon: Mic,
    label: "Audio",
    description: "Voice note, call recording, or voicemail.",
    formats: "mp3 · wav · m4a · aac",
    accept: ".mp3,.wav,.m4a,.aac,audio/*",
    color: "var(--red)",
  },
  {
    id: "image",
    icon: ImageIcon,
    label: "Image",
    description: "Portrait, screenshot, or still frame.",
    formats: "jpg · png · gif · webp",
    accept: ".jpg,.jpeg,.png,.gif,.webp,image/*",
    color: "var(--text-2)",
  },
  {
    id: "video",
    icon: Video,
    label: "Video",
    description: "Clip, social export, or forwarded recording.",
    formats: "mp4 · mov · mkv · webm",
    accept: ".mp4,.mov,.mkv,.webm,video/*",
    color: "var(--text-2)",
  },
];

const MAX_SIZE_MB = 50;

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const res = sessionStorage.getItem("analysisResult");
    if (res) {
      try {
        const parsed = JSON.parse(res);
        if (parsed.error) {
          setError(typeof parsed.error === 'string' ? parsed.error : "Analysis failed. Please try again.");
          sessionStorage.removeItem("analysisResult");
        }
      } catch (e) {
        console.error("Error parsing analysis result:", e);
      }
    }
  }, []);

  function getFileIcon(input: File) {
    if (input.type.startsWith("audio")) return FileAudio;
    if (input.type.startsWith("image")) return FileImage;
    return FileVideo;
  }

  function handleFile(input: File) {
    setError("");
    if (input.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_SIZE_MB} MB.`);
      return;
    }
    const name = input.name.toLowerCase();
    if (name.endsWith('.heic') || name.endsWith('.heif')) {
      setError("HEIC images are currently not supported. Please convert to JPEG or PNG.");
      return;
    }
    if (!selectedType) {
      if (input.type.startsWith("audio")) setSelectedType("audio");
      else if (input.type.startsWith("image")) setSelectedType("image");
      else if (input.type.startsWith("video")) setSelectedType("video");
    }
    setFile(input);
  }

  function handleAnalyze() {
    if (!file) { setError("Select a file first."); return; }
    const mediaType =
      selectedType ||
      (file.type.startsWith("audio") ? "audio" : file.type.startsWith("image") ? "image" : "video");

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      import("@/lib/fileStore").then(({ setFileStore }) => {
        setFileStore(
          { name: file.name, size: file.size, type: file.type, mediaType, lastModified: file.lastModified },
          dataUrl,
        );
        router.push("/processing");
      });
    };
    reader.readAsDataURL(file);
  }

  const activeType = mediaTypes.find((t) => t.id === selectedType);

  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container page-narrow stack-lg">

          <header className="page-intro fade-in">
            <span className="eyebrow">Upload</span>
            <h1 className="page-title">Select your file.</h1>
            <p className="page-subtitle">
              Choose a media type, drop the file, then run analysis.
            </p>
          </header>

          {/* Media type picker */}
          <div className="upload-types">
            {mediaTypes.map((type) => {
              const isSelected = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  className={`choice-card${isSelected ? " is-selected" : ""}`}
                  onClick={() => { setSelectedType(type.id); setFile(null); setError(""); }}
                >
                  <span className="choice-icon">
                    <type.icon size={20} color={isSelected ? "var(--red)" : "var(--text-2)"} />
                  </span>
                  <div style={{ fontWeight: 700 }}>{type.label}</div>
                  <p className="note" style={{ margin: "8px 0 0", fontSize: "0.83rem" }}>
                    {type.description}
                  </p>
                  <div
                    className="mono"
                    style={{ marginTop: 12, color: "var(--text-3)", fontSize: "0.75rem" }}
                  >
                    {type.formats}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Upload + sidebar */}
          <div className="workspace-grid">
            <div className="surface" style={{ padding: 22 }}>
              <div className="stack-md">
                {/* File chip */}
                {file && (
                  <div className="file-chip">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {(() => { const Icon = getFileIcon(file); return <Icon size={18} color="var(--red)" />; })()}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{file.name}</div>
                        <div className="mono note" style={{ fontSize: "0.78rem" }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "Unknown"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => { setFile(null); setError(""); }}
                      aria-label="Remove file"
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}

                {/* Dropzone */}
                <div
                  className={`dropzone${dragOver ? " is-dragging" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                  }}
                >
                  <span className="choice-icon" style={{ width: 52, height: 52, marginBottom: 14 }}>
                    <Upload size={22} color="var(--red)" />
                  </span>
                  <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                    {dragOver ? "Drop to upload" : "Drop file here"}
                  </div>
                  <p className="note" style={{ margin: "8px 0 0", fontSize: "0.85rem" }}>
                    Click to browse. Max {MAX_SIZE_MB} MB.
                  </p>
                  <div className="mono" style={{ marginTop: 12, color: "var(--text-3)", fontSize: "0.75rem" }}>
                    {activeType?.formats || "mp3 · wav · jpg · png · mp4 · mov"}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  accept={activeType?.accept || "audio/*,image/*,video/*"}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </div>
            </div>

            {/* Sidebar */}
            <aside className="surface-muted" style={{ padding: 22 }}>
              <div className="stack-md">
                <div style={{ fontWeight: 700 }}>Before you submit</div>

                <div className="data-list">
                  <div className="data-row">
                    <span className="label">Tip</span>
                    <span className="value" style={{ fontSize: "0.83rem" }}>
                      Select media type first
                    </span>
                  </div>
                  <div className="data-row">
                    <span className="label">Max size</span>
                    <span className="value mono">{MAX_SIZE_MB} MB</span>
                  </div>
                  <div className="data-row">
                    <span className="label">Privacy</span>
                    <span className="value" style={{ fontSize: "0.83rem", textAlign: "right" }}>
                      Client-side only
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px 0 0",
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <LockKeyhole size={15} color="var(--text-3)" style={{ marginTop: 2, flexShrink: 0 }} />
                  <p className="note" style={{ margin: 0, fontSize: "0.82rem" }}>
                    Files are prepared in-browser. History is stored locally.
                  </p>
                </div>

                {error && (
                  <div
                    style={{
                      padding: "12px 14px",
                      border: "1px solid var(--red-border)",
                      borderRadius: "var(--r)",
                      background: "var(--red-dim)",
                      color: "var(--text)",
                      fontSize: "0.85rem",
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  className="button button-primary button-wide"
                  onClick={handleAnalyze}
                >
                  Run Analysis
                </button>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </>
  );
}