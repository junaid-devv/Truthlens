// Shared types for analysis results
export interface AnalysisResult {
  analysisId: string;
  fileName: string;
  fileType: 'audio' | 'image' | 'video';
  overall_verdict: 'REAL' | 'UNCERTAIN' | 'LIKELY_FAKE' | 'FAKE';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  probability_ai_generated: number;
  confidence_in_verdict: 'low' | 'medium' | 'high';
  audio_artifacts: string[];
  image_artifacts: string[];
  visual_artifacts?: string[]; // Specifically for video/image visual details
  video_visual?: {
    verdict: string;
    artifacts: string[];
    notes: string;
  };
  emotion_consistency: {
    detected_emotion: string;
    detected_confidence: number;
    claimed_context: string;
    consistency_score: number;
    consistency_label: 'consistent' | 'mismatch' | 'contradiction';
    explanation: string;
  };
  face_check?: {
    match: string;
    interpretation: string;
    heatmap_zones?: {
      top: string;
      left?: string;
      right?: string;
      size: number;
      opacity: number;
    }[];
  };
  content_classification: {
    likely_type: string;
    confidence: number;
    matched_scenario: string;
    contradiction_level: 'none' | 'low' | 'medium' | 'high';
    key_entities: string[];
  };
  suggested_scenario: string;
  plain_language_explanation: string;
  verdict_sentence: string;
  recommended_action: string;
  error?: boolean;
  timestamp?: number;
}

export function getRiskColor(risk: string): string {
  switch (risk) {
    case 'critical': return '#ef4444';
    case 'high': return '#f87171';
    case 'medium': return '#eab308';
    case 'low': return '#22c55e';
    default: return '#94a3b8';
  }
}

export function getVerdictColor(verdict: string): string {
  switch (verdict) {
    case 'FAKE': return '#ef4444';
    case 'LIKELY_FAKE': return '#f97316';
    case 'UNCERTAIN': return '#eab308';
    case 'REAL': return '#22c55e';
    default: return '#94a3b8';
  }
}

export function getVerdictLabel(verdict: string): string {
  switch (verdict) {
    case 'FAKE': return 'AI Generated';
    case 'LIKELY_FAKE': return 'Likely AI Generated';
    case 'UNCERTAIN': return 'Uncertain';
    case 'REAL': return 'Authentic';
    default: return 'Unknown';
  }
}

export function getRiskBadgeClass(risk: string): string {
  switch (risk) {
    case 'critical': return 'badge-critical';
    case 'high': return 'badge-high';
    case 'medium': return 'badge-medium';
    case 'low': return 'badge-low';
    default: return 'badge-low';
  }
}
