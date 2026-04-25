import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { HfInference } from '@huggingface/inference';

// ─── HF Inference client ───────────────────────────────────────────────────────
// provider: 'hf-inference' is passed explicitly in every SDK call to force the
// classic serverless endpoint. Without it, 'auto' resolves to undefined for most
// audio models and throws "No Inference Provider available".
const HF_TOKEN = process.env.HF_TOKEN || '';
const hf = new HfInference(HF_TOKEN);
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

// Keep legacy router for zero-shot text classification (BART-MNLI works here)
const HF_ROUTER = 'https://router.huggingface.co/hf-inference/models';

const MAX_GEMINI_WAIT_MS = 8000;

const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

// ─── Whisper transcription models ─────────────────────────────────────────────
//
// MODEL 1: openai/whisper-large-v3
//   Parameters: 1.54B
//   Trained on: 680K hours of multilingual audio
//   Supports: 99 languages including Hindi, Urdu, English, Arabic, etc.
//   What it does: Converts the spoken audio/video audio track into text. This
//                 transcript replaces the filename as input to BART-MNLI, giving
//                 the fraud detector the ACTUAL SPOKEN WORDS instead of a filename
//                 like "clip_001.mp4" which tells BART nothing useful.
//                 Example: "I am calling from your bank, your account is compromised,
//                 please send money urgently" → BART classifies as "Phone Scam" ✅
//   Inference provider: hf-inference ✅ (live)
//
// MODEL 2: openai/whisper-base (fallback)
//   Parameters: 74M — much lighter, almost never cold on serverless
//   What it does: Same transcription task, lower accuracy, faster cold start.
//   Inference provider: hf-inference ✅ (live)
//
const WHISPER_MODELS = [
  'openai/whisper-large-v3',
  'openai/whisper-base',
];

// ─── Audio deepfake detection models ──────────────────────────────────────────
//
// MODEL 1: Bisher/wav2vec2_ASV_deepfake_audio_detection
//   Base: facebook/wav2vec2-base (94.6M params)
//   Trained on: ASVspoof dataset (academic anti-spoofing benchmark)
//   Labels: "fake" / "real"
//   Detects: TTS and voice-conversion attacks via learned acoustic fingerprints
//   Provider: hf-inference ✅
//
// MODEL 2: abhishtagatya/hubert-base-960h-itw-deepfake
//   Base: facebook/hubert-base-ls960 (94.6M params)
//   Trained on: "In The Wild" deepfake dataset — real social media voice clones
//   Labels: "fake" / "bonafide"
//   Detects: Modern cloning tools (ElevenLabs, RVC) in uncontrolled environments.
//            Different training domain from Model 1 = better combined coverage.
//   Provider: hf-inference ✅
//
// MODEL 3: Gustking/wav2vec2-large-xlsr-deepfake-audio-classification (last resort)
//   Base: wav2vec2-large-xlsr-53 (315.7M params)
//   Trained on: Multilingual deepfake corpus
//   Labels: "fake" / "real"
//   Detects: Deepfakes in accented / non-English speech. Larger capacity but
//            slower cold-start — kept as last resort only.
//   Provider: hf-inference ✅ (intermittently cold)
//
const AUDIO_DEEPFAKE_MODELS = [
  'Bisher/wav2vec2_ASV_deepfake_audio_detection',
  'abhishtagatya/hubert-base-960h-itw-deepfake',
  'Gustking/wav2vec2-large-xlsr-deepfake-audio-classification',
];

// ─── Emotion recognition models ───────────────────────────────────────────────
//
// MODEL 1: firdhokk/speech-emotion-recognition-with-openai-whisper-large-v3
//   Base: openai/whisper-large-v3 (637M params) fine-tuned for classification
//   Trained on: RAVDESS + CREMA-D + TESS + SAVEE emotional speech datasets
//   Labels: angry / disgust / fear / happy / neutral / sad / surprise
//   Why: Whisper's 680K-hour pre-training makes it robust to noisy/compressed audio —
//        critical for real-world deepfake videos that are often re-encoded many times.
//   Provider: hf-inference ✅
//
// MODEL 2: DunnBC22/wav2vec2-base-Speech_Emotion_Recognition
//   Base: facebook/wav2vec2-base (94.6M params)
//   Trained on: RAVDESS dataset
//   Labels: angry / calm / disgust / fearful / happy / neutral / sad / surprised
//   Why: Fast lightweight fallback with a different architecture from Model 1.
//   Provider: hf-inference ✅
//
const EMOTION_MODELS = [
  'firdhokk/speech-emotion-recognition-with-openai-whisper-large-v3',
  'DunnBC22/wav2vec2-base-Speech_Emotion_Recognition',
];

// ─── Whisper transcription ─────────────────────────────────────────────────────
// Converts audio/video audio track to text for use in BART-MNLI context
// classification. Returns null on failure — BART falls back to filename gracefully.
async function hfTranscribeAudio(audioBuffer: ArrayBuffer): Promise<string | null> {
  for (const model of WHISPER_MODELS) {
    try {
      console.log(`[HF-SDK] automaticSpeechRecognition → ${model}`);
      const result = await hf.automaticSpeechRecognition({
        model,
        data: new Blob([audioBuffer]),
        provider: 'hf-inference',
      });
      const text = result?.text?.trim() ?? '';
      if (!text) {
        console.warn(`[Whisper] ⚠️ ${model} returned empty transcript — trying next...`);
        continue;
      }
      console.log(`[Whisper] ✅ ${model} → "${text.slice(0, 120)}..."`);
      return text;
    } catch (e: unknown) {
      console.warn(`[Whisper] ⚠️ ${model}: ${String(e).slice(0, 120)} — trying next...`);
    }
  }
  console.error('[Whisper] ❌ All transcription models failed');
  return null;
}

// ─── HF audio classification ───────────────────────────────────────────────────
async function hfAudioClassify(
  model: string,
  audioBuffer: ArrayBuffer,
): Promise<{ label: string; score: number }[]> {
  console.log(`[HF-SDK] audioClassification → ${model}`);
  const result = await hf.audioClassification({
    model,
    data: new Blob([audioBuffer]),
    provider: 'hf-inference',
  });
  console.log(`[HF-SDK] ✅ ${model}`, JSON.stringify(result).slice(0, 120));
  return result as { label: string; score: number }[];
}

// ─── Waterfall: try each audio model in sequence ───────────────────────────────
async function hfAudioWithFallback(
  models: string[],
  audioBuffer: ArrayBuffer,
  tag: string,
): Promise<{ result: { label: string; score: number }[]; modelUsed: string } | null> {
  for (const model of models) {
    try {
      const result = await hfAudioClassify(model, audioBuffer);
      return { result, modelUsed: model };
    } catch (e: unknown) {
      console.warn(`[Pipeline] ${tag} ⚠️ ${model}: ${String(e).slice(0, 120)} — trying next...`);
    }
  }
  console.error(`[Pipeline] ${tag} ❌ All ML models exhausted`);
  return null;
}

// ─── Gemini audio/video analysis — FALLBACK if all ML models fail ──────────────
async function geminiAnalyzeAudio(
  ai: GoogleGenAI,
  rawBase64: string,
  mimeType: string,
  fileName: string,
): Promise<Record<string, unknown> | null> {
  const prompt = `You are an expert forensic audio analyst for a deepfake detection system.
Analyze this ${mimeType.startsWith('video') ? 'video' : 'audio'} recording for signs of AI generation or deepfake manipulation.
Look for: unnatural prosody, missing breathing, TTS artifacts, pitch inconsistencies,
spectral anomalies, voice cloning signatures, or for video, facial artifacts, unnatural lip sync, or background flickering.
Also detect the dominant emotion expressed.
File name: "${fileName}"
Return ONLY a JSON object (no markdown):
{
  "probability_fake": integer 0-100,
  "label": "FAKE" | "REAL" | "UNCERTAIN",
  "detected_emotion": string,
  "emotion_confidence": integer 0-100,
  "artifacts": [string],
  "visual_artifacts": [string],
  "notes": string
}`;

  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[GeminiAudio-Fallback] Analyzing with ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: [{
          role: 'user', parts: [
            { inlineData: { mimeType, data: rawBase64 } },
            { text: prompt },
          ]
        }],
      });
      const text = (response.text ?? '').trim()
        .replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(text) as Record<string, unknown>;
      console.log(`[GeminiAudio-Fallback] ✅ label=${parsed.label} fake=${parsed.probability_fake}%`);
      return parsed;
    } catch (e: unknown) {
      const s = String(e);
      const is429 = s.includes('429') || s.includes('RESOURCE_EXHAUSTED');
      if (is429) {
        const m = s.match(/retry in (\d+(?:\.\d+)?)/i);
        const wait = m ? Math.min(Math.ceil(parseFloat(m[1]) * 1000), MAX_GEMINI_WAIT_MS) : 4000;
        console.warn(`[GeminiAudio-Fallback] 429 on ${model} — waiting ${wait}ms...`);
        await new Promise(r => setTimeout(r, wait));
      } else {
        console.error(`[GeminiAudio-Fallback] ❌ ${model}:`, s.slice(0, 200));
      }
    }
  }
  return null;
}

// ─── HF image classification ───────────────────────────────────────────────────
async function hfImageClassify(
  model: string,
  imageBuffer: ArrayBuffer,
  mimeType: string,
): Promise<Record<string, unknown>[]> {
  console.log(`[HF-SDK] imageClassification → ${model}`);
  const normalizedMime = mimeType && mimeType.startsWith('image/')
    ? mimeType
    : 'image/png';
  const result = await hf.imageClassification({
    model,
    data: new Blob([imageBuffer], { type: normalizedMime }),
    provider: 'hf-inference',
  });
  console.log(`[HF-SDK] ✅ ${model}`, JSON.stringify(result).slice(0, 120));
  return result as unknown as Record<string, unknown>[];
}

// ─── BART-MNLI zero-shot context classification ────────────────────────────────
//
// facebook/bart-large-mnli
//   What it does: Classifies any text against candidate labels using Natural
//                 Language Inference — no task-specific training needed.
//   Audio/Video input: Whisper transcript (actual spoken words) — strong signal.
//   Image input: Filename — weak signal but only option without audio.
//   Why transcript matters: BART can reason over "I am calling from your bank,
//   your account is compromised" and correctly output "Phone Scam" with high
//   confidence. A filename like "voice_msg_001.ogg" tells it nothing.
//
async function hfZeroShot(
  text: string,
  labels: string[],
): Promise<Record<string, unknown>> {
  const url = `${HF_ROUTER}/facebook/bart-large-mnli`;
  console.log(`[HF] POST zero-shot → ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: text,
      parameters: { candidate_labels: labels, multi_label: false },
    }),
  });
  const responseText = await res.text();
  if (!res.ok) {
    console.error(`[HF] ❌ bart-large-mnli → HTTP ${res.status}: ${responseText.slice(0, 300)}`);
    throw new Error(`BART MNLI → ${res.status}: ${responseText.slice(0, 200)}`);
  }
  console.log(`[HF] ✅ bart-large-mnli → OK`);
  return JSON.parse(responseText);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function base64ToBlob(b64: string): { blob: Blob; mimeType: string; rawBase64: string } {
  const [header, data] = b64.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bytes = Buffer.from(data, 'base64');
  return { blob: new Blob([bytes], { type: mimeType }), mimeType, rawBase64: data };
}

function safeScore(
  result: unknown,
  fakeLabels: string[],
): { score: number; label: string } {
  if (!Array.isArray(result) || result.length === 0) return { score: 0.5, label: 'UNCERTAIN' };
  const sorted = [...result].sort(
    (a: { score: number }, b: { score: number }) => b.score - a.score,
  );
  const top = sorted[0] as { label: string; score: number };
  console.log(`[Score] top label="${top.label}" score=${top.score.toFixed(3)}`);
  const isFake = fakeLabels.some(l => top.label?.toLowerCase().includes(l));
  return { score: isFake ? top.score : 1 - top.score, label: isFake ? 'FAKE' : 'REAL' };
}

function buildGeminiPrompt(data: Record<string, unknown>): string {
  return `You are the analysis engine for TruthLens, a deepfake detection platform.
Synthesize the ML model results below into a clear, trustworthy, plain-language report.

INPUT:
${JSON.stringify(data, null, 2)}

YOUR OUTPUT must be a JSON object with exactly these fields:
{
  "overall_verdict": "REAL" | "UNCERTAIN" | "LIKELY_FAKE" | "FAKE",
  "risk_level": "low" | "medium" | "high" | "critical",
  "probability_ai_generated": integer (0-100),
  "confidence_in_verdict": "low" | "medium" | "high",
  "audio_artifacts": [string],
  "image_artifacts": [string],
  "visual_artifacts": [string],
  "emotion_consistency": {
    "detected_emotion": string,
    "detected_confidence": integer,
    "claimed_context": string,
    "consistency_score": integer,
    "consistency_label": "consistent" | "mismatch" | "contradiction",
    "explanation": string
  },
  "content_classification": {
    "likely_type": string,
    "confidence": integer,
    "matched_scenario": string,
    "contradiction_level": "none" | "low" | "medium" | "high",
    "key_entities": [string]
  },
  "suggested_scenario": string,
  "plain_language_explanation": string,
  "verdict_sentence": string,
  "recommended_action": string
}

RULES:
1. If both deepfake models agree FAKE with score > 0.7, verdict must be FAKE.
2. Emotion inconsistency (score < 40) raises risk one tier.
3. Never produce REAL verdict if any model scores > 0.85 for fake.
4. plain_language_explanation written for a non-technical 60+ year old person. Max 4 sentences.
5. Never mention model names or technical jargon in user-facing text fields.
6. verdict_sentence must be one declarative sentence.
7. audio_artifacts must be concrete findings (max 6). Empty array if no audio analyzed.
8. image_artifacts must be concrete findings (max 6). Empty array if no image analyzed.
9. visual_artifacts must be concrete findings specifically from visual analysis (especially for video/images).
10. If file_type is "image", audio_artifacts MUST be an empty array [].
11. If file_type is "audio", image_artifacts and visual_artifacts MUST be an empty array [].
12. If file_type is "video", synthesize both audio and visual findings.
13. If all ML scores are null (no models ran), use "UNCERTAIN" verdict with low confidence.
14. For video, prioritize video_visual data in the input for visual_artifacts.
15. If transcript is provided, use it to inform claimed_context and key_entities.
    If the transcript reveals urgent requests for money, account details, OTPs, or
    personal information, treat this as strong additional fraud signal — raise risk
    accordingly even if ML scores are moderate.
Respond with ONLY the JSON object, no markdown fences, no preamble.`;
}

// ─── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('\n======== [TruthLens] Analysis Started ========');
  try {
    const body = await req.json();
    const { fileData, fileName, fileType, mimeType } = body as {
      fileData: string;
      fileName: string;
      fileType: string;
      mimeType: string;
    };

    console.log(`[API] File: "${fileName}" | Type: ${fileType} | MIME: ${mimeType}`);
    console.log(`[API] HF Token: ${HF_TOKEN ? 'YES (' + HF_TOKEN.slice(0, 8) + '...)' : 'NO ❌'}`);
    console.log(`[API] Gemini Key: ${GEMINI_KEY ? 'YES (' + GEMINI_KEY.slice(0, 8) + '...)' : 'NO ❌'}`);

    if (!fileData) return NextResponse.json({ error: 'No file data' }, { status: 400 });

    const { rawBase64, mimeType: detectedMime } = base64ToBlob(fileData);
    const resolvedMime = mimeType || detectedMime;
    const isAudio = fileType === 'audio' || mimeType.startsWith('audio');
    const isImage = fileType === 'image' || mimeType.startsWith('image');
    const isVideo = fileType === 'video' || mimeType.startsWith('video');

    console.log(`[API] Detected → isAudio=${isAudio} isImage=${isImage} isVideo=${isVideo}`);

    type HfAudioResult = { label: string; score: number }[];
    type GeminiAudioPayload = {
      probability_fake: number;
      label: string;
      detected_emotion: string;
      emotion_confidence: number;
      artifacts: string[];
      notes: string;
    };
    type AudioFallbackResult = {
      result: HfAudioResult;
      modelUsed: string;
      geminiAudio?: GeminiAudioPayload;
    };

    const R: {
      audio: AudioFallbackResult | null;
      emotion: AudioFallbackResult | null;
      imagePrimary: Record<string, unknown>[] | null;
      imageSecondary: Record<string, unknown>[] | null;
      context: Record<string, unknown> | null;
      transcript: string | null;
    } = {
      audio: null,
      emotion: null,
      imagePrimary: null,
      imageSecondary: null,
      context: null,
      transcript: null,
    };

    const ai = GEMINI_KEY ? new GoogleGenAI({ apiKey: GEMINI_KEY }) : null;
    const tasks: Promise<void>[] = [];

    // ── Audio / Video pipeline ─────────────────────────────────────────────
    if (isAudio || isVideo) {
      const audioBytes = Buffer.from(rawBase64, 'base64');
      const audioBuffer = audioBytes.buffer.slice(
        audioBytes.byteOffset,
        audioBytes.byteOffset + audioBytes.byteLength,
      ) as ArrayBuffer;

      // Deepfake detection: Bisher → abhishtagatya → Gustking → Gemini fallback
      tasks.push(
        hfAudioWithFallback(AUDIO_DEEPFAKE_MODELS, audioBuffer, 'AudioDeepfake')
          .then(async mlResult => {
            if (mlResult) {
              R.audio = mlResult;
            } else if (ai) {
              console.warn('[Pipeline] AudioDeepfake — all ML models failed, using Gemini fallback');
              const g = await geminiAnalyzeAudio(ai, rawBase64, resolvedMime, fileName);
              if (g) R.audio = { result: [], modelUsed: 'gemini-fallback', geminiAudio: g as GeminiAudioPayload };
            }
          })
          .catch(e => { console.error('[Pipeline] AudioDeepfake fatal:', e); }),
      );

      // Emotion detection: firdhokk (Whisper-large) → DunnBC22 (wav2vec2)
      tasks.push(
        hfAudioWithFallback(EMOTION_MODELS, audioBuffer, 'Emotion')
          .then(r => { R.emotion = r; })
          .catch(e => { console.error('[Pipeline] Emotion fatal:', e); }),
      );

      // ── Whisper → BART pipeline ──────────────────────────────────────────
      // Transcription runs in parallel with the other audio tasks.
      // Once transcript is ready, it immediately kicks off BART-MNLI.
      // If Whisper fails, BART gracefully falls back to filename-based input.
      tasks.push(
        hfTranscribeAudio(audioBuffer)
          .then(async transcript => {
            R.transcript = transcript;

            // Cap transcript at 1000 chars — BART has a 1024 token limit
            const bartInput = transcript
              ? `Spoken content: "${transcript.slice(0, 1000)}"`
              : `File name: ${fileName}. This is a ${fileType} file being analyzed for authenticity and potential fraud.`;

            console.log(
              `[Whisper→BART] Input source: ${transcript ? 'transcript' : 'filename (Whisper unavailable)'}`,
            );

            try {
              const result = await hfZeroShot(
                bartInput,
                ['Phone Scam', 'Romance Fraud', 'Political Content', 'Job Fraud', 'Identity Impersonation', 'Authentic Content'],
              );
              R.context = result as Record<string, unknown>;
              console.log('[Pipeline] BART-MNLI ✅', JSON.stringify(result).slice(0, 120));
            } catch (e) {
              console.error('[Pipeline] BART-MNLI ❌', (e as Error).message);
            }
          })
          .catch(e => { console.error('[Pipeline] Transcription+BART fatal:', e); }),
      );
    }

    // ── Image pipeline ─────────────────────────────────────────────────────
    // No audio track → BART uses filename as input (weakest signal, unavoidable)
    // dima806: GAN and face-swap deepfake detector (FaceForensics++ trained)
    // Organika: Stable Diffusion XL generated image detector
    if (isImage) {
      const imageBytes = Buffer.from(rawBase64, 'base64');
      const imageBuffer = imageBytes.buffer.slice(
        imageBytes.byteOffset,
        imageBytes.byteOffset + imageBytes.byteLength,
      ) as ArrayBuffer;

      tasks.push(
        hfImageClassify('dima806/deepfake_vs_real_image_detection', imageBuffer, resolvedMime)
          .then(r => { R.imagePrimary = r; })
          .catch(e => { console.error('[Pipeline] Image primary ❌', e.message); }),
      );
      tasks.push(
        hfImageClassify('Organika/sdxl-detector', imageBuffer, resolvedMime)
          .then(r => { R.imageSecondary = r; })
          .catch(e => { console.error('[Pipeline] Image secondary ❌', e.message); }),
      );

      // Images: BART uses filename — no audio to transcribe
      tasks.push(
        hfZeroShot(
          `File name: ${fileName}. This is an image file being analyzed for authenticity and potential manipulation.`,
          ['Phone Scam', 'Romance Fraud', 'Political Content', 'Job Fraud', 'Identity Impersonation', 'Authentic Content'],
        )
          .then(r => {
            R.context = r as Record<string, unknown>;
            console.log('[Pipeline] BART-MNLI (image/filename) ✅', JSON.stringify(r).slice(0, 120));
          })
          .catch(e => { console.error('[Pipeline] BART-MNLI ❌', e.message); }),
      );
    }

    // ── Video visual analysis via Gemini ───────────────────────────────────
    if (isVideo && ai) {
      tasks.push(
        geminiAnalyzeAudio(ai, rawBase64, resolvedMime, fileName)
          .then(g => { if (g) (R as any).videoVisual = g; })
          .catch(e => { console.error('[Pipeline] Video Visual fatal:', e); }),
      );
    }

    console.log(`[API] Running ${tasks.length} parallel tasks...`);
    await Promise.all(tasks);
    console.log(`[API] All tasks done in ${Date.now() - startTime}ms`);

    if (R.transcript) {
      console.log(`[Transcript] "${R.transcript.slice(0, 200)}${R.transcript.length > 200 ? '...' : ''}"`);
    } else if (isAudio || isVideo) {
      console.log('[Transcript] Not available — BART fell back to filename');
    }

    // ── Score aggregation ──────────────────────────────────────────────────
    const geminiAudioFallback = R.audio?.geminiAudio ?? null;
    let audioDeepfake: { score: number; label: string } | null = null;

    if (R.audio?.result && R.audio.result.length > 0) {
      // Label notes:
      // Bisher      → "fake" / "real"
      // abhishtagatya → "fake" / "bonafide"  ("bonafide" won't match fake labels → REAL ✅)
      // Gustking    → "fake" / "real"
      audioDeepfake = safeScore(R.audio.result, ['fake', 'spoof', 'generated', 'synthetic', 'deepfake']);
      console.log(`[Audio] ML result via ${R.audio.modelUsed}: ${JSON.stringify(audioDeepfake)}`);
    } else if (geminiAudioFallback) {
      audioDeepfake = {
        score: (geminiAudioFallback.probability_fake as number) / 100,
        label: geminiAudioFallback.label as string,
      };
      console.log(`[Audio] Gemini fallback: ${JSON.stringify(audioDeepfake)}`);
    }

    const imagePrimary = R.imagePrimary
      ? safeScore(R.imagePrimary, ['fake', 'deepfake', 'synthetic', 'ai'])
      : null;
    const imageSecondary = R.imageSecondary
      ? safeScore(R.imageSecondary, ['artificial', 'fake', 'generated', 'sdxl', 'ai'])
      : null;

    // Emotion labels:
    // firdhokk → angry / disgust / fear / happy / neutral / sad / surprise
    // DunnBC22 → angry / calm / disgust / fearful / happy / neutral / sad / surprised
    let topEmotion = 'Neutral';
    let emotionConf = 50;
    if (R.emotion?.result && Array.isArray(R.emotion.result) && R.emotion.result.length > 0) {
      const sorted = [...(R.emotion.result as { label: string; score: number }[])].sort(
        (a, b) => b.score - a.score,
      );
      topEmotion = sorted[0]?.label || 'Neutral';
      emotionConf = Math.round((sorted[0]?.score || 0.5) * 100);
      console.log(`[Emotion] ML: "${topEmotion}" ${emotionConf}% (${R.emotion.modelUsed})`);
    } else if (geminiAudioFallback?.detected_emotion) {
      topEmotion = geminiAudioFallback.detected_emotion as string;
      emotionConf = geminiAudioFallback.emotion_confidence as number ?? 50;
      console.log(`[Emotion] Gemini fallback: "${topEmotion}" ${emotionConf}%`);
    }

    let contextTop = 'Authentic Content';
    let contextConf = 50;
    if (R.context && 'labels' in R.context) {
      const cr = R.context as { labels: string[]; scores: number[] };
      contextTop = cr.labels[0] || 'Authentic Content';
      contextConf = Math.round((cr.scores[0] || 0.5) * 100);
      console.log(`[Context] top="${contextTop}" conf=${contextConf}%`);
    }

    console.log(
      '[Scores]',
      `audio=${audioDeepfake ? (audioDeepfake.score * 100).toFixed(1) + '%' : 'N/A'}`,
      `imagePrimary=${imagePrimary ? (imagePrimary.score * 100).toFixed(1) + '%' : 'N/A'}`,
      `imageSecondary=${imageSecondary ? (imageSecondary.score * 100).toFixed(1) + '%' : 'N/A'}`,
    );

    // ── Build synthesis input ──────────────────────────────────────────────
    // transcript passed through so Gemini can use actual spoken content for
    // claimed_context, key_entities, and fraud signal escalation (Rule 15).
    const synthesisInput = {
      file_type: fileType,
      file_name: fileName,
      transcript: R.transcript ? R.transcript.slice(0, 2000) : null,
      transcript_available: R.transcript !== null,
      image_deepfake_primary: imagePrimary
        ? { model: 'dima806/deepfake_vs_real_image_detection', score: imagePrimary.score, label: imagePrimary.label }
        : null,
      image_deepfake_secondary: imageSecondary
        ? { model: 'Organika/sdxl-detector', score: imageSecondary.score, label: imageSecondary.label }
        : null,
      audio_deepfake: audioDeepfake
        ? {
          model: R.audio?.modelUsed ?? 'unknown',
          score: audioDeepfake.score,
          label: audioDeepfake.label,
          detected_artifacts: geminiAudioFallback?.artifacts ?? [],
          notes: geminiAudioFallback?.notes ?? '',
        }
        : null,
      emotion_detected: isAudio || isVideo
        ? { model: R.emotion?.modelUsed ?? 'gemini-fallback', emotion: topEmotion, confidence: emotionConf / 100 }
        : null,
      context_classification: {
        model: 'facebook/bart-large-mnli',
        input_source: R.transcript ? 'whisper_transcript' : 'filename',
        top_label: contextTop,
        confidence: contextConf / 100,
      },
      user_claimed_context: null,
      video_visual: (R as any).videoVisual || null,
    };

    // ── Gemini synthesis ───────────────────────────────────────────────────
    let geminiOutput: Record<string, unknown> = {};
    if (ai) {
      const prompt = buildGeminiPrompt(synthesisInput);

      outerLoop:
      for (const model of GEMINI_MODELS) {
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[Gemini] Calling ${model} (attempt ${attempt})...`);
            const response = await ai.models.generateContent({ model, contents: prompt });
            const text = response.text?.trim() || '';
            console.log(`[Gemini] Response length: ${text.length} chars`);
            const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
            geminiOutput = JSON.parse(cleaned);
            console.log(`[Gemini] ✅ Verdict: ${geminiOutput.overall_verdict} (model: ${model})`);
            break outerLoop;
          } catch (e: unknown) {
            const errStr = String(e);
            const is429 = errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED');
            if (is429 && attempt === 1) {
              const delayMatch = errStr.match(/retry in (\d+(?:\.\d+)?)/i);
              const suggestedMs = delayMatch ? Math.ceil(parseFloat(delayMatch[1]) * 1000) + 500 : 5000;
              if (suggestedMs > MAX_GEMINI_WAIT_MS) {
                console.warn(`[Gemini] ⚠️ 429 on ${model} — wait ${suggestedMs}ms > cap. Skipping.`);
                break;
              }
              console.warn(`[Gemini] ⚠️ 429 on ${model} — waiting ${suggestedMs}ms...`);
              await new Promise(r => setTimeout(r, suggestedMs));
              continue;
            }
            console.error(`[Gemini] ❌ ${model} attempt ${attempt}:`, errStr.slice(0, 300));
            break;
          }
        }
      }

      // ── Score-based heuristic fallback ────────────────────────────────────
      if (Object.keys(geminiOutput).length === 0) {
        const fakeScore = Math.max(
          audioDeepfake?.score ?? 0,
          imagePrimary?.score ?? 0,
          imageSecondary?.score ?? 0,
        );
        const hasAnyScore = audioDeepfake || imagePrimary || imageSecondary;
        console.log(`[Gemini] All models failed. Score-based fallback. fakeScore=${fakeScore.toFixed(3)}`);
        geminiOutput = {
          overall_verdict: !hasAnyScore ? 'UNCERTAIN' : fakeScore > 0.85 ? 'FAKE' : fakeScore > 0.65 ? 'LIKELY_FAKE' : fakeScore > 0.4 ? 'UNCERTAIN' : 'REAL',
          risk_level: !hasAnyScore ? 'medium' : fakeScore > 0.85 ? 'critical' : fakeScore > 0.65 ? 'high' : fakeScore > 0.4 ? 'medium' : 'low',
          probability_ai_generated: hasAnyScore ? Math.round(fakeScore * 100) : 50,
          confidence_in_verdict: hasAnyScore ? 'medium' : 'low',
          audio_artifacts: isAudio && audioDeepfake?.label === 'FAKE'
            ? ['Synthetic voice patterns detected', 'Unnatural spectral characteristics found', 'Pitch variations inconsistent with human speech']
            : [],
          image_artifacts: isImage && imagePrimary?.label === 'FAKE'
            ? ['Facial manipulation artifacts detected', 'GAN fingerprint identified in pixel patterns', 'Blending boundary inconsistencies found']
            : [],
          visual_artifacts: isVideo ? ((R as any).videoVisual?.artifacts || []) : [],
          video_visual: (R as any).videoVisual || null,
          emotion_consistency: {
            detected_emotion: topEmotion,
            detected_confidence: emotionConf,
            claimed_context: contextTop,
            consistency_score: 50,
            consistency_label: 'mismatch',
            explanation: 'Automated report synthesis was temporarily unavailable. Emotion data shown is from direct model output.',
          },
          content_classification: {
            likely_type: contextTop,
            confidence: contextConf,
            matched_scenario: contextTop,
            contradiction_level: 'medium',
            key_entities: R.transcript ? [fileName, R.transcript.slice(0, 80)] : [fileName],
          },
          suggested_scenario: `This ${fileType} file shows ${fakeScore > 0.5 ? 'significant' : 'minimal'} signs of AI manipulation.`,
          plain_language_explanation: hasAnyScore
            ? `Our detection systems found a ${Math.round(fakeScore * 100)}% probability that this content is AI-generated. ${fakeScore > 0.5 ? 'This is above our alert threshold. You should be very cautious about trusting this content.' : 'The content appears to be authentic based on our checks. Always verify important information through official channels.'}`
            : 'We were unable to complete a full analysis of this file. This may be due to the file format or temporary service unavailability. Please try again or use a different file.',
          verdict_sentence: !hasAnyScore
            ? 'Analysis could not be completed — please try again.'
            : fakeScore > 0.65
              ? `This ${fileType} is highly likely to be AI-generated and should not be trusted.`
              : `This ${fileType} appears authentic based on available detection results.`,
          recommended_action: !hasAnyScore
            ? 'Please re-upload the file or try a different format. Ensure it is under 50MB.'
            : fakeScore > 0.65
              ? isAudio
                ? 'Do not trust this voice message. Call the person back on a verified number to confirm their identity.'
                : 'Do not share or act on this image. It shows strong signs of digital manipulation or AI generation.'
              : 'Content appears authentic, but always verify important claims through official or trusted sources.',
        };
      }
    } else {
      console.error('[Gemini] ❌ No API key configured');
      geminiOutput = {
        overall_verdict: 'UNCERTAIN',
        risk_level: 'medium',
        probability_ai_generated: 50,
        confidence_in_verdict: 'low',
        audio_artifacts: [],
        image_artifacts: [],
        emotion_consistency: {
          detected_emotion: topEmotion,
          detected_confidence: emotionConf,
          claimed_context: 'Unknown',
          consistency_score: 50,
          consistency_label: 'mismatch',
          explanation: 'Report synthesis API key not configured.',
        },
        content_classification: {
          likely_type: contextTop,
          confidence: contextConf,
          matched_scenario: contextTop,
          contradiction_level: 'medium',
          key_entities: [fileName],
        },
        suggested_scenario: 'Analysis unavailable — no synthesis API key.',
        plain_language_explanation: 'The AI analysis service is not configured. Please contact the administrator.',
        verdict_sentence: 'Full analysis unavailable due to missing configuration.',
        recommended_action: 'Please configure the GEMINI_API_KEY environment variable.',
      };
    }

    const elapsed = Date.now() - startTime;
    console.log(`======== [TruthLens] Analysis Complete in ${elapsed}ms ========\n`);

    // transcript returned to frontend — display it in the UI if desired
    return NextResponse.json({ ...geminiOutput, transcript: R.transcript ?? null, timestamp: Date.now() });
  } catch (err) {
    console.error('[API] ❌ Fatal error:', err);
    return NextResponse.json({ error: true, message: String(err) }, { status: 500 });
  }
}
