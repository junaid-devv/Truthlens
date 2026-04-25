"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Image as ImageIcon,
  Mic,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import {
  clearHistory,
  deleteHistoryEntry,
  getHistory,
  type HistoryEntry,
} from "@/lib/storage";
import { getRiskColor, getVerdictLabel } from "@/lib/types";

const PER_PAGE = 8;

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TypeIcon({ type }: { type: string }) {
  const color =
    type === "audio" ? "#1cc7b3" : type === "image" ? "#60c7ff" : "#7a9cff";

  return (
    <span
      className="signal-icon"
      style={{
        width: 42,
        height: 42,
        borderColor: `${color}40`,
        background: `${color}12`,
      }}
    >
      {type === "audio" && <Mic size={18} color={color} />}
      {type === "image" && <ImageIcon size={18} color={color} />}
      {type === "video" && <Video size={18} color={color} />}
    </span>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>(() => getHistory());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return history.filter((entry) => {
      if (
        search &&
        !entry.fileName.toLowerCase().includes(search.trim().toLowerCase())
      ) {
        return false;
      }

      if (typeFilter !== "all" && entry.fileType !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [history, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function refreshHistory() {
    setHistory(getHistory());
  }

  function handleViewResult(entry: HistoryEntry) {
    sessionStorage.setItem("analysisResult", JSON.stringify(entry.result));
    router.push("/results");
  }

  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container stack-lg">
          <header
            className="fade-in"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div className="page-intro">
              <span className="eyebrow">History</span>
              <h1 className="page-title">Recent analyses stored locally.</h1>
              <p className="page-subtitle">
                Search, filter, reopen, or clear local results.
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {history.length > 0 && (
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => {
                    clearHistory();
                    setHistory([]);
                    setPage(1);
                  }}
                >
                  <Trash2 size={16} />
                  Clear All
                </button>
              )}
              <Link href="/upload" className="button button-primary">
                New Analysis
              </Link>
            </div>
          </header>

          <section className="surface-muted" style={{ padding: 18 }}>
            <div className="section-grid-2" style={{ gap: 14 }}>
              <label
                className="surface"
                style={{
                  padding: "0 16px",
                  minHeight: 52,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <Search size={18} color="var(--text-soft)" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search by file name"
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: 0,
                    outline: 0,
                    color: "var(--text)",
                  }}
                />
              </label>

              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  setPage(1);
                }}
                className="surface"
                style={{
                  minHeight: 52,
                  padding: "0 16px",
                  background: "var(--panel)",
                  color: "var(--text)",
                  borderRadius: 18,
                  border: "1px solid var(--line)",
                  outline: 0,
                }}
              >
                <option value="all">All media types</option>
                <option value="audio">Audio</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
              </select>
            </div>
          </section>

          {history.length === 0 ? (
            <section className="surface empty-state">
              <div
                className="signal-icon"
                style={{ margin: "0 auto 18px", width: 58, height: 58 }}
              >
                <History size={24} color="var(--accent)" />
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                No analyses yet
              </div>
              <p className="note" style={{ margin: "12px auto 0", maxWidth: 440 }}>
                Run an analysis and it will appear here.
              </p>
            </section>
          ) : (
            <section className="history-table">
              <div className="history-head">
                <span>File</span>
                <span>Type</span>
                <span>Verdict</span>
                <span>Risk</span>
                <span>Timestamp</span>
                <span />
              </div>

              {visible.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontWeight: 700 }}>No matching results</div>
                  <p className="note" style={{ margin: "12px 0 0" }}>
                    Try a different search or filter.
                  </p>
                </div>
              ) : (
                visible.map((entry) => {
                  const riskColor = getRiskColor(entry.riskLevel);

                  return (
                    <div
                      key={entry.analysisId}
                      className="history-entry"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleViewResult(entry)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleViewResult(entry);
                        }
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          minWidth: 0,
                        }}
                      >
                        <TypeIcon type={entry.fileType} />
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {entry.fileName}
                          </div>
                          <div className="note mono" style={{ fontSize: "0.82rem" }}>
                            {entry.analysisId}
                          </div>
                        </div>
                      </div>

                      <span style={{ textTransform: "capitalize" }}>
                        {entry.fileType}
                      </span>

                      <span className="pill" style={{ justifySelf: "start" }}>
                        {getVerdictLabel(entry.verdict)}
                      </span>

                      <span className="mono" style={{ color: riskColor, fontWeight: 700 }}>
                        {entry.probability}%
                      </span>

                      <span className="note">{formatDate(entry.timestamp)}</span>

                      <button
                        type="button"
                        className="icon-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteHistoryEntry(entry.analysisId);
                          refreshHistory();
                          if (visible.length === 1 && page > 1) {
                            setPage((current) => current - 1);
                          }
                        }}
                        aria-label={`Delete ${entry.fileName}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </section>
          )}

          {filtered.length > PER_PAGE && (
            <section
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 20,
                flexWrap: "wrap",
              }}
            >
              <div className="note">
                Showing {(page - 1) * PER_PAGE + 1} to{" "}
                {Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  disabled={page === totalPages}
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}
