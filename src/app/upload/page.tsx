"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileAudio,
  FileImage,
  FileVideo,
  FolderUp,
  Image as ImageIcon,
  Info,
  LockKeyhole,
  Mic,
  Network,
  ShieldCheck,
  Video,
  X,
} from "lucide-react";
import Navbar from "@/components/Navbar";

const mediaTypes = [
  {
    id: "image",
    icon: ImageIcon,
    label: "Image",
    formats: "JPG, PNG, GIF, WEBP",
    accept: ".jpg,.jpeg,.png,.gif,.webp,image/*",
  },
  {
    id: "audio",
    icon: Mic,
    label: "Audio",
    formats: "MP3, WAV, M4A, AAC",
    accept: ".mp3,.wav,.m4a,.aac,audio/*",
  },
  {
    id: "video",
    icon: Video,
    label: "Video",
    formats: "MP4, MOV, MKV, WEBM",
    accept: ".mp4,.mov,.mkv,.webm,video/*",
  },
];

const trustItems = [
  {
    icon: LockKeyhole,
    title: "Privacy protected",
    text: "Files stay in the current analysis session.",
  },
  {
    icon: ShieldCheck,
    title: "Evidence-backed analysis",
    text: "Results include verdict, risk, confidence, and artifacts.",
  },
  {
    icon: Network,
    title: "Multi-model detection",
    text: "Signals are combined into one readable case result.",
  },
];

const MAX_SIZE_MB = 50;

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState("image");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState(() => {
    if (typeof window === "undefined") return "";
    const res = sessionStorage.getItem("analysisResult");
    if (!res) return "";
    try {
      const parsed = JSON.parse(res);
      if (parsed.error) {
        sessionStorage.removeItem("analysisResult");
        return typeof parsed.error === "string"
          ? parsed.error
          : "Analysis failed. Please try again.";
      }
    } catch (e) {
      console.error("Error parsing analysis result:", e);
    }
    return "";
  });

  const activeType = mediaTypes.find((t) => t.id === selectedType) ?? mediaTypes[0];

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
    if (name.endsWith(".heic") || name.endsWith(".heif")) {
      setError("HEIC images are currently not supported. Convert to JPEG or PNG.");
      return;
    }
    if (input.type.startsWith("audio")) setSelectedType("audio");
    else if (input.type.startsWith("image")) setSelectedType("image");
    else if (input.type.startsWith("video")) setSelectedType("video");
    setFile(input);
  }

  function handleAnalyze() {
    if (!file) {
      setError("Select a file first.");
      return;
    }

    const mediaType = file.type.startsWith("audio")
      ? "audio"
      : file.type.startsWith("image")
        ? "image"
        : file.type.startsWith("video")
          ? "video"
          : selectedType;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      import("@/lib/fileStore").then(({ setFileStore }) => {
        setFileStore(
          {
            name: file.name,
            size: file.size,
            type: file.type,
            mediaType,
            lastModified: file.lastModified,
          },
          dataUrl,
        );
        router.push("/processing");
      });
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <Navbar />
      <div className="page-content viewport-page">
        <main className="page-container viewport-container">
          <section className="workspace-grid viewport-grid">
            <div className="surface compact-surface" style={{ padding: 22 }}>
              <div className="stack-sm" style={{ height: "100%" }}>
                <header>
                  <h1
                    className="page-title"
                    style={{ fontSize: "clamp(1.8rem, 3vw, 2.45rem)", marginTop: 0 }}
                  >
                    Upload Media
                  </h1>
                  <p className="page-subtitle" style={{ marginTop: 6, fontSize: "0.96rem" }}>
                    Upload an image, audio file, or video for forensic analysis.
                  </p>
                </header>

                <div
                  role="tablist"
                  aria-label="Media type"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--r)",
                    overflow: "hidden",
                  }}
                >
                  {mediaTypes.map((type) => {
                    const selected = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        className="tab-btn"
                        onClick={() => {
                          setSelectedType(type.id);
                          setError("");
                        }}
                        style={{
                          borderRadius: 0,
                          minHeight: 48,
                          border: 0,
                          borderRight:
                            type.id === "video" ? 0 : "1px solid var(--line-2)",
                        }}
                      >
                        <type.icon size={20} />
                        {type.label}
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <div className="surface-muted" style={{ padding: 14 }}>
                    <p className="note" style={{ color: "var(--danger)" }}>
                      {error}
                    </p>
                  </div>
                )}

                <div
                  className={`dropzone${dragOver ? " is-dragging" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload media file"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f) handleFile(f);
                  }}
                >
                  <span className="choice-icon" style={{ width: 68, height: 54, marginBottom: 14 }}>
                    {file ? (
                      (() => {
                        const Icon = getFileIcon(file);
                        return <Icon size={34} color="var(--accent-2)" />;
                      })()
                    ) : (
                      <FolderUp size={38} color="var(--accent-2)" />
                    )}
                  </span>

                  {file ? (
                    <>
                      <div
                        style={{
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "1.08rem",
                          fontWeight: 850,
                        }}
                      >
                        {file.name}
                      </div>
                      <p className="note" style={{ marginTop: 8 }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB /{" "}
                        {file.type || "Unknown type"}
                      </p>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: "1.08rem", fontWeight: 850 }}>
                        Drag & drop files here or{" "}
                        <span style={{ color: "var(--accent-2)" }}>browse</span>
                      </div>
                      <p className="note" style={{ marginTop: 8 }}>
                        Supports {activeType.formats}
                      </p>
                    </>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    className="note"
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.84rem", minWidth: 0 }}
                  >
                    <Info size={16} />
                    Max file size: {MAX_SIZE_MB}MB
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {file && (
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() => {
                          setFile(null);
                          setError("");
                        }}
                      >
                        <X size={16} />
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={handleAnalyze}
                      disabled={!file}
                    >
                      Start
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  accept={activeType.accept}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            </div>

            <aside className="surface compact-surface" style={{ padding: 18 }}>
              <div className="stack-md" style={{ height: "100%", justifyContent: "center" }}>
                {trustItems.map((item) => (
                  <div key={item.title} className="signal-row">
                    <span className="choice-icon" style={{ width: 50, height: 50 }}>
                      <item.icon size={23} color="var(--accent-2)" />
                    </span>
                    <div>
                      <div style={{ fontSize: "1rem", fontWeight: 850 }}>
                        {item.title}
                      </div>
                      <p className="note" style={{ marginTop: 4, fontSize: "0.84rem" }}>
                        {item.text}
                      </p>
                    </div>
                    <CheckCircle2 size={18} color="var(--success)" />
                  </div>
                ))}

                <div
                  className="note"
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    paddingTop: 16,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <LockKeyhole size={16} />
                  We do not store your files after analysis.
                </div>
              </div>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
}
