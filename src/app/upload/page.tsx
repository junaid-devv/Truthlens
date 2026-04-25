"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileAudio,
  FileImage,
  FileVideo,
  Image as ImageIcon,
  Info,
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
    description: "Voice note, call recording, or suspicious voicemail.",
    formats: "mp3, wav, m4a, aac",
    accept: ".mp3,.wav,.m4a,.aac,audio/*",
    color: "#1cc7b3",
  },
  {
    id: "image",
    icon: ImageIcon,
    label: "Image",
    description: "Portrait, screenshot, or suspicious still frame.",
    formats: "jpg, png, gif, webp",
    accept: ".jpg,.jpeg,.png,.gif,.webp,image/*",
    color: "#60c7ff",
  },
  {
    id: "video",
    icon: Video,
    label: "Video",
    description: "Clip, social export, or forwarded recording.",
    formats: "mp4, mov, mkv, webm",
    accept: ".mp4,.mov,.mkv,.webm,video/*",
    color: "#7a9cff",
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

  function getFileIcon(input: File) {
    if (input.type.startsWith("audio")) {
      return FileAudio;
    }
    if (input.type.startsWith("image")) {
      return FileImage;
    }
    return FileVideo;
  }

  function handleFile(input: File) {
    setError("");

    if (input.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    if (!selectedType) {
      if (input.type.startsWith("audio")) {
        setSelectedType("audio");
      } else if (input.type.startsWith("image")) {
        setSelectedType("image");
      } else if (input.type.startsWith("video")) {
        setSelectedType("video");
      }
    }

    setFile(input);
  }

  function handleAnalyze() {
    if (!file) {
      setError("Select a file before starting analysis.");
      return;
    }

    const mediaType =
      selectedType ||
      (file.type.startsWith("audio")
        ? "audio"
        : file.type.startsWith("image")
          ? "image"
          : "video");

    const reader = new FileReader();

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;

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

  const activeType = mediaTypes.find((type) => type.id === selectedType);

  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container page-narrow stack-lg">
          <header className="page-intro fade-in">
            <span className="eyebrow">Upload and analyze</span>
            <h1 className="page-title">Start with the suspicious file.</h1>
            <p className="page-subtitle">
              Select a media type, upload, and run analysis.
            </p>
          </header>

          <section className="upload-types">
            {mediaTypes.map((type) => {
              const isSelected = selectedType === type.id;

              return (
                <button
                  key={type.id}
                  type="button"
                  className={`choice-card${isSelected ? " is-selected" : ""}`}
                  onClick={() => {
                    setSelectedType(type.id);
                    setFile(null);
                    setError("");
                  }}
                >
                  <span className="choice-icon">
                    <type.icon
                      size={24}
                      color={isSelected ? "var(--accent)" : type.color}
                    />
                  </span>
                  <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                    {type.label}
                  </div>
                  <p className="note" style={{ margin: "10px 0 0" }}>
                    {type.description}
                  </p>
                  <div
                    className="mono"
                    style={{
                      marginTop: 16,
                      color: "var(--text-soft)",
                      fontSize: "0.82rem",
                    }}
                  >
                    {type.formats}
                  </div>
                </button>
              );
            })}
          </section>

          <section className="workspace-grid">
            <div className="surface" style={{ padding: 28 }}>
              <div className="stack-md">
                {file && (
                  <div className="file-chip">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {(() => {
                        const Icon = getFileIcon(file);
                        return <Icon size={20} color="var(--accent)" />;
                      })()}
                      <div>
                        <div style={{ fontWeight: 700 }}>{file.name}</div>
                        <div className="note" style={{ fontSize: "0.88rem" }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                          {file.type || "Unknown type"}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => {
                        setFile(null);
                        setError("");
                      }}
                      aria-label="Remove file"
                    >
                      <X size={18} />
                    </button>
                  </div>
                )}

                <div
                  className={`dropzone${dragOver ? " is-dragging" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragOver(false);
                    const dropped = event.dataTransfer.files[0];
                    if (dropped) {
                      handleFile(dropped);
                    }
                  }}
                >
                  <span
                    className="choice-icon"
                    style={{
                      marginBottom: 18,
                      width: 64,
                      height: 64,
                    }}
                  >
                    <Upload size={28} color="var(--accent)" />
                  </span>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                    {dragOver ? "Release to add the file" : "Drop the file here"}
                  </div>
                  <p className="note" style={{ margin: "10px 0 0", maxWidth: 460 }}>
                    Click to browse or drag and drop. Max size: 50 MB.
                  </p>
                  <div
                    className="mono"
                    style={{
                      marginTop: 16,
                      color: "var(--text-soft)",
                      fontSize: "0.84rem",
                    }}
                  >
                    {activeType?.formats || "mp3, wav, jpg, png, mp4, mov, webm"}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: "none" }}
                  accept={activeType?.accept || "audio/*,image/*,video/*"}
                  onChange={(event) => {
                    const nextFile = event.target.files?.[0];
                    if (nextFile) {
                      handleFile(nextFile);
                    }
                  }}
                />
              </div>
            </div>

            <aside className="surface-muted" style={{ padding: 28 }}>
              <div className="stack-md">
                <div className="stack-sm">
                  <span className="eyebrow">Quick notes</span>
                  <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>
                    Upload once, verify fast.
                  </div>
                </div>

                <div className="helper-row">
                  <div className="label">Tip</div>
                  <div style={{ marginTop: 8, fontWeight: 700 }}>
                    If you know the media type, select it first.
                  </div>
                </div>

                <div className="helper-row">
                  <div className="label">Privacy handling</div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <LockKeyhole
                      size={18}
                      color="var(--accent)"
                      style={{ marginTop: 3, flexShrink: 0 }}
                    />
                    <p className="note" style={{ margin: 0 }}>
                      Files are prepared client-side first. History stays local
                      in this browser.
                    </p>
                  </div>
                </div>

                {error && (
                  <div
                    className="surface"
                    style={{
                      padding: 16,
                      borderColor: "rgba(239, 100, 100, 0.26)",
                      background: "rgba(239, 100, 100, 0.08)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <Info
                        size={16}
                        color="var(--danger)"
                        style={{ marginTop: 2, flexShrink: 0 }}
                      />
                      <div className="note" style={{ margin: 0, color: "var(--text)" }}>
                        {error}
                      </div>
                    </div>
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
          </section>
        </main>
      </div>
    </>
  );
}
