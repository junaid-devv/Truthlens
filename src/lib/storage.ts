import type { AnalysisResult } from './types';

const HISTORY_KEY = 'truthlens_history';
const MAX_HISTORY = 100;

export interface HistoryEntry {
  id: string;
  fileName: string;
  fileType: 'audio' | 'image' | 'video';
  verdict: string;
  riskLevel: string;
  probability: number;
  analysisId: string;
  timestamp: number;
  result: AnalysisResult;
}

export function saveToHistory(result: AnalysisResult): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getHistory();
    const entry: HistoryEntry = {
      id: result.analysisId,
      fileName: result.fileName,
      fileType: result.fileType,
      verdict: result.overall_verdict,
      riskLevel: result.risk_level,
      probability: result.probability_ai_generated,
      analysisId: result.analysisId,
      timestamp: result.timestamp ?? Date.now(),
      result,
    };
    // Avoid duplicates
    const filtered = existing.filter(e => e.analysisId !== result.analysisId);
    const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save to history:', e);
  }
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function deleteHistoryEntry(analysisId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getHistory();
    const updated = existing.filter(e => e.analysisId !== analysisId);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to delete history entry:', e);
  }
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.warn('Failed to clear history:', e);
  }
}
