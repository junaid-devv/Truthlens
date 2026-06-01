// ─── Shared verdict types and utilities ───────────────────────────────────────

export type Verdict = 'REAL' | 'FAKE' | 'SUSPICIOUS' | 'UNCERTAIN' | 'ERROR';

export interface ModelResult {
  model:      string;
  modelId?:   string;
  verdict:    Verdict | null;
  confidence: number;
  rawLabel?:  string;
  ran:        boolean;
}

/** Shape returned by /api/analyze/image */
export interface ImageAnalysisResponse {
  verdict:       Verdict;
  confidence:    number;
  fakeScore:     number;
  realScore:     number;
  modelsRan:     number;
  modelsFailed:  number;
  models:        ModelResult[];
  durationMs:    number;
  error?:        string;
}

/** Shape returned by /api/analyze/audio */
export interface AudioAnalysisResponse {
  verdict:      Verdict;
  confidence:   number;
  raw:          { label: string; score: number }[];
  colabOnline:  boolean;
  model?:       string;
  durationMs?:  number;
  error?:       string;
  transcription?: string;
  scam_analysis?: {
    is_scam: boolean;
    scam_type: string;
    details: string;
    confidence: number;
  };
  emotion_consistency?: {
    detected_emotion: string;
    consistency_score: number;
    explanation: string;
  };
}

/** Shape returned by /api/analyze/video */
export interface VideoAnalysisResponse {
  verdict:          Verdict;
  confidence:       number;
  probability_fake: number;
  reasons:          string[];
  visual_artifacts: string[];
  audio_artifacts:  string[];
  fake_segments?:   { start_sec: number; end_sec: number; issue: string }[];
  audio_verdict?:   Verdict | 'NO_AUDIO';
  detected_emotion?: string;
  face_match?:      string;
  notes?:           string;
  transcription?:   string;
  scam_analysis?: {
    is_scam: boolean;
    scam_type: string;
    details: string;
    confidence: number;
  };
  model?:           string;
  durationMs?:      number;
  error?:           string;
}

// ─── Verdict helpers ───────────────────────────────────────────────────────────
export function getVerdictColor(v: Verdict | string): string {
  switch (v) {
    case 'FAKE':       return '#ef4444';
    case 'SUSPICIOUS': return '#f97316';
    case 'UNCERTAIN':  return '#eab308';
    case 'REAL':       return '#22c55e';
    default:           return '#94a3b8';
  }
}

export function getVerdictBg(v: Verdict | string): string {
  switch (v) {
    case 'FAKE':       return 'rgba(239,68,68,0.08)';
    case 'SUSPICIOUS': return 'rgba(249,115,22,0.08)';
    case 'UNCERTAIN':  return 'rgba(234,179,8,0.08)';
    case 'REAL':       return 'rgba(34,197,94,0.08)';
    default:           return 'rgba(148,163,184,0.08)';
  }
}

export function getVerdictLabel(v: Verdict | string): string {
  switch (v) {
    case 'FAKE':       return 'AI Generated';
    case 'SUSPICIOUS': return 'Suspicious';
    case 'UNCERTAIN':  return 'Uncertain';
    case 'REAL':       return 'Authentic';
    case 'ERROR':      return 'Analysis Error';
    default:           return 'Unknown';
  }
}

// ─── Map new API responses → existing AnalysisResult shape ────────────────────
// The results page expects the AnalysisResult shape defined in lib/types.ts.
// These adapters normalise the new per-type responses into that shape so the
// entire UI continues working without modification.

import type { AnalysisResult } from './types';

export function adaptImageResult(
  r: ImageAnalysisResponse,
  meta: { analysisId: string; fileName: string },
): AnalysisResult {
  const prob = r.verdict === 'FAKE' ? r.fakeScore : r.verdict === 'REAL' ? 100 - r.realScore : r.verdict === 'SUSPICIOUS' ? r.fakeScore : 50;
  const risk: AnalysisResult['risk_level'] =
    prob >= 80 ? 'critical' : prob >= 60 ? 'high' : prob >= 40 ? 'medium' : 'low';

  const artifacts: string[] = [];
  if (r.verdict === 'FAKE' || r.verdict === 'SUSPICIOUS') {
    if (r.fakeScore > 70) artifacts.push('Strong AI-generation fingerprint detected');
    if (r.modelsRan >= 2 && r.models.filter(m => m.verdict === 'FAKE').length >= 2)
      artifacts.push('Multiple independent models agree on manipulation');
  }

  const zones = [];
  if (r.verdict === 'FAKE' || r.verdict === 'SUSPICIOUS') {
    const opacityVal = Math.min(0.85, 0.4 + (prob / 200));
    zones.push(
      { top: '32%', left: '38%', size: 105, opacity: opacityVal },
      { top: '50%', left: '44%', size: 85, opacity: opacityVal * 0.8 },
    );
  }

  return {
    analysisId:    meta.analysisId,
    fileName:      meta.fileName,
    fileType:      'image',
    overall_verdict:
      r.verdict === 'FAKE'       ? 'FAKE'      :
      r.verdict === 'SUSPICIOUS' ? (prob >= 50 ? 'LIKELY_FAKE' : 'UNCERTAIN') :
      r.verdict === 'REAL'       ? 'REAL'       : 'UNCERTAIN',
    risk_level:             risk,
    probability_ai_generated: prob,
    confidence_in_verdict:
      r.modelsRan >= 3 ? 'high' : r.modelsRan >= 2 ? 'medium' : 'low',
    audio_artifacts:  [],
    image_artifacts:  artifacts,
    visual_artifacts: [],
    emotion_consistency: {
      detected_emotion:  'N/A',
      detected_confidence: 0,
      claimed_context:   'N/A',
      consistency_score: 100,
      consistency_label: 'consistent',
      explanation:       'Emotion analysis is not applicable for image files.',
    },
    content_classification: {
      likely_type:          'Image Content',
      confidence:           r.confidence,
      matched_scenario:     r.verdict === 'FAKE' ? 'AI-Generated Image' : 'Authentic Photograph',
      contradiction_level:  'none',
      key_entities:         [meta.fileName],
    },
    face_check: { match: 'No strong match', interpretation: 'Verify with source', heatmap_zones: zones },
    suggested_scenario:
      r.verdict === 'FAKE'       ? 'This image appears to have been generated or manipulated by AI.'     :
      r.verdict === 'SUSPICIOUS' ? 'This image shows some signs of AI manipulation — verify carefully.' :
                                   'This image appears to be an authentic photograph.',
    plain_language_explanation:
      r.verdict === 'FAKE'
        ? `${r.modelsRan} AI detection system${r.modelsRan > 1 ? 's' : ''} identified this image as AI-generated with ${r.fakeScore}% certainty. Do not trust this image without verification.`
        : r.verdict === 'SUSPICIOUS'
          ? 'Some AI detection signals were found but results were mixed. Treat this image with caution.'
          : `${r.modelsRan} detection system${r.modelsRan > 1 ? 's' : ''} found no signs of AI generation. The image appears authentic.`,
    verdict_sentence:
      r.verdict === 'FAKE'       ? 'This image is AI-generated and should not be trusted.'           :
      r.verdict === 'SUSPICIOUS' ? 'This image shows suspicious signs and warrants further scrutiny.' :
      r.verdict === 'REAL'       ? 'This image appears to be an authentic photograph.'                :
                                   'Analysis was inconclusive — results could not be determined.',
    recommended_action:
      r.verdict === 'FAKE' || r.verdict === 'SUSPICIOUS'
        ? 'Do not share or act on this image. Use a reverse image search and verify with the original source.'
        : 'Image appears authentic. Always verify important visuals through official or trusted sources.',
    // Store raw model breakdown for the results page Image tab
    image_models: r.models,
    timestamp: Date.now(),
  } as AnalysisResult & { image_models: ModelResult[] };
}

export function adaptAudioResult(
  r: AudioAnalysisResponse,
  meta: { analysisId: string; fileName: string },
): AnalysisResult {
  if (r.verdict === 'ERROR') {
    return {
      analysisId:    meta.analysisId,
      fileName:      meta.fileName,
      fileType:      'audio',
      overall_verdict: 'UNCERTAIN',
      risk_level:    'medium',
      probability_ai_generated: 50,
      confidence_in_verdict: 'low',
      audio_artifacts: [],
      image_artifacts: [],
      visual_artifacts: [],
      emotion_consistency: {
        detected_emotion: 'N/A', detected_confidence: 0,
        claimed_context: 'N/A', consistency_score: 50,
        consistency_label: 'mismatch',
        explanation: 'Audio analysis server (Colab) was offline or unreachable.',
      },
      content_classification: {
        likely_type: 'Audio Content', confidence: 0,
        matched_scenario: 'Unknown', contradiction_level: 'medium', key_entities: [meta.fileName],
      },
      suggested_scenario: 'Analysis could not be completed — Colab server was offline.',
      plain_language_explanation: r.error ?? 'The audio analysis server was not available. Please ensure the Colab notebook is running.',
      verdict_sentence: 'Analysis could not be completed — audio server was offline.',
      recommended_action: 'Start the Colab notebook (run all 4 cells) and update COLAB_AUDIO_URL in .env.local, then try again.',
      error: true,
      timestamp: Date.now(),
    };
  }

  const isFake = r.verdict === 'FAKE';
  const prob = isFake ? r.confidence : 100 - r.confidence;
  const risk: AnalysisResult['risk_level'] =
    prob >= 80 ? 'critical' : prob >= 60 ? 'high' : prob >= 40 ? 'medium' : 'low';

  return {
    analysisId:    meta.analysisId,
    fileName:      meta.fileName,
    fileType:      'audio',
    overall_verdict:
      r.verdict === 'FAKE' ? 'FAKE' : r.verdict === 'REAL' ? 'REAL' : 'UNCERTAIN',
    risk_level:              risk,
    probability_ai_generated: prob,
    confidence_in_verdict:   r.confidence >= 80 ? 'high' : r.confidence >= 55 ? 'medium' : 'low',
    audio_artifacts: isFake
      ? ['Synthetic voice characteristics detected', 'Acoustic fingerprints inconsistent with human speech']
      : [],
    image_artifacts:  [],
    visual_artifacts: [],
    emotion_consistency: {
      detected_emotion:    r.emotion_consistency?.detected_emotion ?? 'N/A',
      detected_confidence: r.confidence,
      claimed_context:     'Audio Recording',
      consistency_score:   r.emotion_consistency?.consistency_score ?? 100,
      consistency_label:   (r.emotion_consistency?.consistency_score ?? 100) < 40 ? 'contradiction' : (r.emotion_consistency?.consistency_score ?? 100) < 70 ? 'mismatch' : 'consistent',
      explanation:         r.emotion_consistency?.explanation ?? 'Emotion consistency analysis complete.',
    },
    content_classification: {
      likely_type:         r.scam_analysis?.is_scam ? (r.scam_analysis.scam_type || 'Voice Scam') : 'Audio Content',
      confidence:          r.scam_analysis?.is_scam ? r.scam_analysis.confidence : r.confidence,
      matched_scenario:    r.scam_analysis?.is_scam ? r.scam_analysis.scam_type : (isFake ? 'AI-Generated Voice' : 'Authentic Recording'),
      contradiction_level: r.scam_analysis?.is_scam ? 'high' : 'none',
      key_entities:        [meta.fileName, r.scam_analysis?.scam_type].filter(Boolean) as string[],
    },
    suggested_scenario: r.scam_analysis?.is_scam
      ? `This audio features a potential ${r.scam_analysis.scam_type}.`
      : (isFake ? 'This audio recording shows signs of AI voice synthesis or cloning.' : 'This audio recording appears to be an authentic human voice.'),
    plain_language_explanation: r.scam_analysis?.is_scam
      ? `Scam detection identified a potential ${r.scam_analysis.scam_type} (${r.scam_analysis.confidence}% confidence): ${r.scam_analysis.details}`
      : (isFake ? `AI deepfake detection found this recording to be ${r.confidence}% likely synthetic. Do not trust this voice without verification.` : `The recording appears authentic with ${r.confidence}% confidence.`),
    verdict_sentence: r.scam_analysis?.is_scam
      ? `Suspicious activity: potential ${r.scam_analysis.scam_type} detected.`
      : (isFake ? 'This audio is likely AI-generated and should not be trusted.' : 'This audio appears to be an authentic human recording.'),
    recommended_action: r.scam_analysis?.is_scam
      ? 'CRITICAL: Do not transfer money, share credentials, or verify identity. Contact the claimant directly through verified independent channels.'
      : (isFake ? 'Do not trust this voice message. Call the person back on a verified number to confirm their identity.' : 'Audio appears authentic. Always verify important claims through official or trusted sources.'),
    transcription: r.transcription,
    scam_analysis: r.scam_analysis,
    timestamp: Date.now(),
  };
}

export function adaptVideoResult(
  r: VideoAnalysisResponse,
  meta: { analysisId: string; fileName: string },
): AnalysisResult {
  const isScam = r.scam_analysis?.is_scam;
  const prob = r.probability_fake ?? (r.verdict === 'FAKE' ? 80 : r.verdict === 'SUSPICIOUS' ? 55 : 20);
  const risk: AnalysisResult['risk_level'] =
    isScam ? 'critical' : (prob >= 80 ? 'critical' : prob >= 60 ? 'high' : prob >= 40 ? 'medium' : 'low');

  return {
    analysisId:    meta.analysisId,
    fileName:      meta.fileName,
    fileType:      'video',
    overall_verdict:
      isScam                     ? 'FAKE'       :
      r.verdict === 'FAKE'       ? 'FAKE'       :
      r.verdict === 'SUSPICIOUS' ? (prob >= 50 ? 'LIKELY_FAKE' : 'UNCERTAIN') :
      r.verdict === 'REAL'       ? 'REAL'        : 'UNCERTAIN',
    risk_level:              risk,
    probability_ai_generated: prob,
    confidence_in_verdict:
      (r.confidence ?? 50) >= 80 ? 'high' : (r.confidence ?? 50) >= 55 ? 'medium' : 'low',
    audio_artifacts:  r.audio_artifacts ?? [],
    image_artifacts:  [],
    visual_artifacts: r.visual_artifacts ?? [],
    video_visual: {
      verdict:   r.verdict,
      artifacts: [...(r.visual_artifacts ?? []), ...(r.audio_artifacts ?? [])],
      notes:     r.notes ?? '',
    },
    emotion_consistency: {
      detected_emotion:    r.detected_emotion ?? 'Unknown',
      detected_confidence: r.confidence ?? 50,
      claimed_context:     'Video Content',
      consistency_score:   r.verdict === 'REAL' ? 85 : 40,
      consistency_label:   r.verdict === 'REAL' ? 'consistent' : 'mismatch',
      explanation:         (r.reasons ?? []).join('. '),
    },
    face_check: {
      match:          r.face_match ?? 'No strong match',
      interpretation: 'Verify with source',
      heatmap_zones: (() => {
        const zones = [];
        if (r.verdict === 'FAKE' || r.verdict === 'SUSPICIOUS' || isScam) {
          const opacityVal = Math.min(0.85, 0.4 + (prob / 200));
          zones.push(
            { top: '35%', left: '40%', size: 95, opacity: opacityVal },
            { top: '52%', left: '45%', size: 80, opacity: opacityVal * 0.8 },
          );
        }
        return zones;
      })(),
    },
    content_classification: {
      likely_type:         isScam ? r.scam_analysis!.scam_type : 'Video Content',
      confidence:          isScam ? r.scam_analysis!.confidence : (r.confidence ?? 50),
      matched_scenario:    isScam ? r.scam_analysis!.scam_type : (r.verdict === 'FAKE' ? 'AI-Generated Video' : 'Authentic Video'),
      contradiction_level: isScam ? 'high' : (r.verdict === 'FAKE' ? 'high' : r.verdict === 'SUSPICIOUS' ? 'medium' : 'none'),
      key_entities:        [meta.fileName, isScam ? r.scam_analysis!.scam_type : null].filter(Boolean) as string[],
    },
    suggested_scenario: isScam
      ? `This video contains a potential ${r.scam_analysis!.scam_type} attempt.`
      : ((r.reasons ?? []).slice(0, 2).join('. ') || 'Gemini forensic analysis complete.'),
    plain_language_explanation: isScam
      ? `CRITICAL: Scam detection identified a potential ${r.scam_analysis!.scam_type} (${r.scam_analysis!.confidence}% confidence). Details: ${r.scam_analysis!.details}`
      : (r.verdict === 'FAKE'
        ? `This video shows strong signs of AI manipulation or deepfake generation. Found: ${(r.reasons ?? []).slice(0, 2).join(', ')}.`
        : r.verdict === 'SUSPICIOUS'
          ? `This video has some suspicious elements worth verifying: ${(r.reasons ?? []).slice(0, 2).join(', ')}.`
          : 'This video appears to be authentic based on forensic analysis.'),
    verdict_sentence: isScam
      ? `Suspicious/Fraudulent activity: potential ${r.scam_analysis!.scam_type} detected.`
      : (r.verdict === 'FAKE'       ? 'This video is a deepfake and should not be trusted.'            :
         r.verdict === 'SUSPICIOUS' ? 'This video has suspicious elements and warrants further review.' :
         r.verdict === 'REAL'       ? 'This video appears to be authentic.'                             :
                                     'Analysis was inconclusive.'),
    recommended_action: isScam
      ? 'CRITICAL: Do not transfer money, share credentials, or click on any links shown in this video. Report this scam attempt immediately.'
      : (r.verdict === 'FAKE' || r.verdict === 'SUSPICIOUS'
        ? 'Do not share or act on this video. Verify through the original source before trusting any claims made in it.'
        : 'Video appears authentic. Always verify important content through official or trusted sources.'),
    transcription: r.transcription ?? r.notes,
    scam_analysis: r.scam_analysis,
    timestamp: Date.now(),
  };
}
