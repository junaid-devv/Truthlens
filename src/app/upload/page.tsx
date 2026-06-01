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
      <div className="page-content" style={{ height: "calc(100vh - var(--header-h))", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <main className="page-container" style={{ flex: 1, padding: "20px 0 28px", display: "flex", flexDirection: "column", gap: 16, justifyContent: "center", minHeight: 0 }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <div>
              <span className="eyebrow" style={{ fontSize: "0.68rem" }}>Ingestion dashboard</span>
              <h1 className="page-title" style={{ fontSize: "1.75rem", marginTop: 4, lineHeight: 1.2 }}>Select your file.</h1>
            </div>
            <span className="mono" style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 600 }}>
              [LIMIT: {MAX_SIZE_MB}MB]
            </span>
          </div>

          <div className="surface" style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr", minHeight: 0, overflow: "hidden" }}>
            {/* Left Column: Media selectors */}
            <div style={{ borderRight: "1px solid var(--line)", background: "var(--bg-2)", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <span className="eyebrow" style={{ fontSize: "0.65rem", marginBottom: 4 }}>1. Media Mode</span>
              
              {mediaTypes.map((type) => {
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => { setSelectedType(type.id); setFile(null); setError(""); }}
                    style={{
                      width: "100%",
                      padding: "14px 12px",
                      borderRadius: "var(--r)",
                      border: isSelected ? "1.5px solid var(--red)" : "1px solid var(--line)",
                      background: isSelected ? "var(--red-dim)" : "var(--bg)",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      transition: "border-color 140ms, background 140ms"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <type.icon size={15} color={isSelected ? "var(--red)" : "var(--text-2)"} />
                      <span style={{ fontWeight: 600, fontSize: "0.88rem", color: isSelected ? "var(--text)" : "var(--text-2)" }}>{type.label}</span>
                    </div>
                    <span className="mono" style={{ fontSize: "0.68rem", color: "var(--text-3)", marginLeft: 25 }}>
                      {type.formats}
                    </span>
                  </button>
                );
              })}

              <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid var(--line)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <LockKeyhole size={13} color="var(--text-3)" style={{ marginTop: 2, flexShrink: 0 }} />
                <p className="note" style={{ margin: 0, fontSize: "0.76rem", lineHeight: 1.4 }}>
                  Files are processed client-side. Data remains local.
                </p>
              </div>
            </div>

            {/* Right Column: Dropzone and launcher */}
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>
              <span className="eyebrow" style={{ fontSize: "0.65rem" }}>2. Ingestion</span>

              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    border: "1px solid var(--red-border)",
                    borderRadius: "var(--r)",
                    background: "var(--red-dim)",
                    color: "var(--text)",
                    fontSize: "0.82rem",
                    flexShrink: 0
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                {file ? (
                  <div
                    style={{
                      flex: 1,
                      border: "1.5px solid var(--line-2)",
                      borderRadius: "var(--r-lg)",
                      background: "var(--bg-2)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 24,
                      textAlign: "center"
                    }}
                  >
                    <span className="choice-icon" style={{ width: 52, height: 52, marginBottom: 16, border: "1px solid var(--line)", background: "var(--surface)" }}>
                      {(() => { const Icon = getFileIcon(file); return <Icon size={22} color="var(--red)" />; })()}
                    </span>
                    <div style={{ fontWeight: 600, fontSize: "1.05rem", maxWidth: "90%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.name}
                    </div>
                    <div className="mono note" style={{ fontSize: "0.8rem", marginTop: 6 }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "Unknown"}
                    </div>

                    <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => { setFile(null); setError(""); }}
                        style={{ minHeight: 38, fontSize: "0.8rem" }}
                      >
                        Change File
                      </button>
                      <button
                        type="button"
                        className="button button-primary"
                        onClick={handleAnalyze}
                        style={{ minHeight: 38, fontSize: "0.8rem" }}
                      >
                        Run Forensic Scan
                      </button>
                    </div>
                  </div>
                ) : (
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
                    style={{
                      flex: 1,
                      border: "1.5px dashed var(--line-2)",
                      borderRadius: "var(--r-lg)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 24
                    }}
                  >
                    <span className="choice-icon" style={{ width: 44, height: 44, marginBottom: 12, border: "1px solid var(--line)", background: "var(--surface)" }}>
                      <Upload size={18} color="var(--red)" />
                    </span>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                      {dragOver ? "Drop to upload" : "Drop media file here"}
                    </div>
                    <p className="note" style={{ margin: "6px 0 0", fontSize: "0.82rem" }}>
                      Click to browse. Max {MAX_SIZE_MB} MB.
                    </p>
                    {activeType && (
                      <span className="pill pill-accent" style={{ marginTop: 12, fontSize: "0.68rem" }}>
                        Accepts: {activeType.formats}
                      </span>
                    )}
                  </div>
                )}
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
        </main>
      </div>
    </>
  );
}