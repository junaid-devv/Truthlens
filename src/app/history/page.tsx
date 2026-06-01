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
import { clearHistory, deleteHistoryEntry, getHistory, type HistoryEntry } from "@/lib/storage";
import { getRiskColor, getVerdictLabel } from "@/lib/types";

const PER_PAGE = 8;

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function TypeBadge({ type }: { type: string }) {
  const color =
    type === "audio" ? "var(--red)" :
      type === "image" ? "#60c7ff" : "#8b9fff";
  return (
    <span
      className="mono"
      style={{ color, fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}
    >
      {type}
    </span>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>(() => getHistory());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() =>
    history.filter((e) => {
      if (search && !e.fileName.toLowerCase().includes(search.trim().toLowerCase())) return false;
      if (typeFilter !== "all" && e.fileType !== typeFilter) return false;
      return true;
    }),
    [history, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function handleView(entry: HistoryEntry) {
    sessionStorage.setItem("analysisResult", JSON.stringify(entry.result));
    router.push("/results");
  }

  return (
    <>
      <Navbar />
      <div className="page-content">
        <main className="page-container stack-lg">

          {/* Header */}
          <header
            className="fade-in"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}
          >
            <div className="page-intro">
              <span className="eyebrow">History</span>
              <h1 className="page-title">Past analyses.</h1>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {history.length > 0 && (
                <button
                  type="button"
                  className="button button-danger"
                  onClick={() => { clearHistory(); setHistory([]); setPage(1); }}
                >
                  <Trash2 size={15} />
                  Clear All
                </button>
              )}
              <Link href="/upload" className="button button-primary">New Analysis</Link>
            </div>
          </header>

          {/* Filters */}
          <div className="section-grid-2" style={{ gap: 12 }}>
            <label
              className="surface"
              style={{
                padding: "0 16px",
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "text",
                background: "var(--bg-2)",
              }}
            >
              <Search size={15} color="var(--text-3)" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by filename..."
                style={{
                  width: "100%",
                  background: "transparent",
                  border: 0,
                  outline: 0,
                  color: "var(--text)",
                  fontSize: "0.88rem",
                }}
              />
            </label>

            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              style={{
                minHeight: 44,
                padding: "0 16px",
                background: "var(--surface)",
                color: "var(--text)",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--line)",
                outline: 0,
                fontSize: "0.88rem",
                cursor: "pointer",
              }}
            >
              <option value="all">All types</option>
              <option value="audio">Audio</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>

          {/* Empty state */}
          {history.length === 0 ? (
            <section className="surface empty-state" style={{ background: "var(--bg-2)" }}>
              <div className="signal-icon" style={{ margin: "0 auto 16px", width: 40, height: 40, border: "1px solid var(--line)" }}>
                <History size={16} color="var(--text-3)" />
              </div>
              <div style={{ fontWeight: 600, fontSize: "1.05rem" }}>No analyses yet</div>
              <p className="note" style={{ margin: "8px auto 0", maxWidth: 360, fontSize: "0.86rem" }}>
                Run an analysis — it will appear here.
              </p>
            </section>
          ) : (
            <section className="history-table" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
              <div className="history-head" style={{ background: "var(--bg-2)" }}>
                <span>File</span>
                <span>Type</span>
                <span>Verdict</span>
                <span>Score</span>
                <span>Date</span>
                <span />
              </div>

              {visible.length === 0 ? (
                <div className="empty-state" style={{ padding: "48px 24px" }}>
                  <div style={{ fontWeight: 600 }}>No results found</div>
                  <p className="note" style={{ margin: "8px 0 0", fontSize: "0.85rem" }}>
                    Try a different filter.
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
                      onClick={() => handleView(entry)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleView(entry); }
                      }}
                      style={{ padding: "14px 20px" }}
                    >
                      {/* File info */}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <span className="brand-mark__badge compact" style={{ width: 30, height: 30, border: "1px solid var(--line)", background: "var(--bg-2)" }}>
                          {entry.fileType === "audio" && <Mic size={13} color="var(--red)" />}
                          {entry.fileType === "image" && <ImageIcon size={13} color="#60c7ff" />}
                          {entry.fileType === "video" && <Video size={13} color="#8b9fff" />}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 500,
                              fontSize: "0.88rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {entry.fileName}
                          </div>
                          <div className="mono note" style={{ fontSize: "0.72rem", marginTop: 2 }}>{entry.analysisId}</div>
                        </div>
                      </div>

                      <TypeBadge type={entry.fileType} />

                      <span>
                        <span className="pill" style={{ fontSize: "0.68rem", minHeight: 22, paddingInline: 8 }}>{getVerdictLabel(entry.verdict)}</span>
                      </span>

                      <span
                        className="mono"
                        style={{ color: riskColor, fontWeight: 600, fontSize: "0.85rem" }}
                      >
                        {entry.probability}%
                      </span>

                      <span className="note" style={{ fontSize: "0.82rem" }}>{formatDate(entry.timestamp)}</span>

                      <button
                        type="button"
                        className="icon-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryEntry(entry.analysisId);
                          setHistory(getHistory());
                          if (visible.length === 1 && page > 1) setPage((p) => p - 1);
                        }}
                        aria-label={`Delete ${entry.fileName}`}
                        style={{ width: 32, height: 32 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })
              )}
            </section>
          )}

          {/* Pagination */}
          {filtered.length > PER_PAGE && (
            <section
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}
            >
              <div className="note" style={{ fontSize: "0.83rem" }}>
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  className="button button-secondary button-small"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}