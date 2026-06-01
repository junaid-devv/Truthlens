import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// ─── Colab backend (FastAPI on T4 GPU via ngrok) ───────────────────────────────
const COLAB_URL = (process.env.COLAB_AUDIO_URL ?? '').replace(/\/$/, '');

// ─── Gemini API client ────────────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

function logRun(target: string)               { console.log (`[Audio][RUN ▶] ${target}`); }
function logOk (target: string, d: string)   { console.log (`[Audio][OK  ✅] ${target} → ${d}`); }
function logFail(target: string, e: unknown) { console.error(`[Audio][FAIL ❌] ${target} → ${String(e).slice(0, 200)}`); }

const GEMINI_SYSTEM_PROMPT = `You are a forensic audio analyst specializing in transcription, speech emotion analysis, scam/fraud detection, and voice deepfake analysis.
Analyze the provided audio file for the following:
1. Full speech transcription.
2. Emotional content and voice tones (e.g. urgent, calm, fearful, robotic).
3. Scam and fraud detection: Does the audio depict a scam, phishing, social engineering, financial fraud, impersonation, fake promotion, or other malicious activity? Look for signs of urgency, requests for money, bank transfers, gift cards, password sharing, identity verification, voice verification, or other deceptive content.
4. Voice deepfake/cloning detection: Does the voice sound synthetic, cloned, or generated? Look for speech artifacts, robotic transitions, unnatural pauses, or typical speech synthesizer patterns.

Respond ONLY with valid JSON. No markdown. No text outside the JSON object:
{
  "transcription": "The complete, verbatim transcription of the speech in the audio.",
  "scam_analysis": {
    "is_scam": true or false,
    "scam_type": "Voice cloning scam" | "Financial fraud" | "Impersonation" | "Phishing" | "Deceptive offer" | "None" | "Other (specify)",
    "details": "A detailed explanation of why this audio is classified as a scam or safe, referencing specific phrases used in the transcript.",
    "confidence": <integer 0-100>
  },
  "emotion_consistency": {
    "detected_emotion": "e.g., Urgent / Panicked",
    "consistency_score": <integer 0-100>,
    "explanation": "A description of the emotion and tone detected in the voice."
  },
  "deepfake_analysis": {
    "verdict": "FAKE" | "REAL" | "UNCERTAIN",
    "confidence": <integer 0-100>,
    "details": "A forensic description of any audio artifacts, voice cloning patterns, or synthetic characteristics detected (or if it sounds like a genuine human voice)."
  }
}`;

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('\n══════ [TruthLens/Audio] Analysis Started ══════');

  if (!COLAB_URL) {
    console.error('[Audio][FAIL ❌] COLAB_AUDIO_URL is not set in .env.local');
    return NextResponse.json(
      { error: 'Audio analysis server URL not configured. Add COLAB_AUDIO_URL to .env.local.', verdict: 'ERROR' },
      { status: 503 },
    );
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const mimeType = file.type || 'audio/wav';

  // ── 1. Colab deepfake classification promise ──────────────────────────────────
  const colabPromise = (async () => {
    // Health check
    logRun(`${COLAB_URL}/health`);
    const health = await fetch(`${COLAB_URL}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!health.ok) throw new Error(`health returned HTTP ${health.status}`);
    const hBody = await health.json() as { status: string; gpu: boolean };
    logOk('ColabHealth', `status=${hBody.status} gpu=${hBody.gpu}`);

    // Call analysis
    logRun(`${COLAB_URL}/analyze/audio  [model: mo-thecreator/Deepfake-audio-detection]`);
    const colabForm = new FormData();
    colabForm.append('file', file);

    const res = await fetch(`${COLAB_URL}/analyze/audio`, {
      method: 'POST',
      body:   colabForm,
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const result = await res.json() as {
      verdict:    string;
      confidence: number;
      raw:        { label: string; score: number }[];
      error?:     string;
    };

    if (result.error) throw new Error(result.error);
    return result;
  })();

  // ── 2. Gemini transcription & scam analysis promise ──────────────────────────
  const geminiPromise = (async () => {
    logRun(`Gemini Files API upload [${file.name}, ${(file.size / 1024).toFixed(1)}KB]`);
    const arrayBuffer = await file.arrayBuffer();
    const uploadedFile = await ai.files.upload({
      file:   new Blob([arrayBuffer], { type: mimeType }),
      config: { mimeType, displayName: file.name },
    });
    logOk('FilesAPI Upload (Audio)', `name=${uploadedFile.name} state=${uploadedFile.state}`);

    // Poll until active
    let fileState = uploadedFile;
    const pollStart = Date.now();
    while (fileState.state === 'PROCESSING') {
      if (Date.now() - pollStart > 60_000) {
        throw new Error('Gemini audio file processing timed out');
      }
      await new Promise(r => setTimeout(r, 2_000));
      fileState = await ai.files.get({ name: uploadedFile.name! });
    }

    if (fileState.state === 'FAILED') {
      throw new Error('Gemini audio file processing failed');
    }
    logOk('FilesAPI Poll (Audio)', `state=${fileState.state} uri=${fileState.uri}`);

    // Run analysis
    logRun(`gemini-2.5-flash / audio transcription & scam detection`);
    const response = await ai.models.generateContent({
      model:    'gemini-2.5-flash',
      contents: [{
        parts: [
          { fileData: { mimeType, fileUri: fileState.uri! } },
          { text: GEMINI_SYSTEM_PROMPT },
        ],
      }],
    });

    const text = (response.text ?? '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    logOk('gemini-2.5-flash', `raw response length=${text.length}`);

    return JSON.parse(text) as {
      transcription: string;
      scam_analysis: {
        is_scam: boolean;
        scam_type: string;
        details: string;
        confidence: number;
      };
      emotion_consistency: {
        detected_emotion: string;
        consistency_score: number;
        explanation: string;
      };
      deepfake_analysis: {
        verdict: 'FAKE' | 'REAL' | 'UNCERTAIN';
        confidence: number;
        details: string;
      };
    };
  })();

  // ── 3. Parallel Execution ───────────────────────────────────────────────────
  let colabError: string | null = null;
  let geminiError: string | null = null;

  const colabWrapped = colabPromise.catch(err => {
    colabError = String(err?.message || err);
    return null;
  });

  const geminiWrapped = geminiPromise.catch(err => {
    geminiError = String(err?.message || err);
    return null;
  });

  const [colabResult, geminiResult] = await Promise.all([colabWrapped, geminiWrapped]);

  if (!colabResult) {
    logFail('ColabAudio', colabError);
    // Fallback to Gemini's in-model deepfake assessment
    if (geminiResult && geminiResult.deepfake_analysis) {
      logOk('AudioFallback', `Using Gemini deepfake analysis fallback: verdict=${geminiResult.deepfake_analysis.verdict}`);
      const isFakeFallback = geminiResult.deepfake_analysis.verdict === 'FAKE';

      return NextResponse.json({
        verdict:     geminiResult.deepfake_analysis.verdict,
        confidence:  geminiResult.deepfake_analysis.confidence,
        raw:         [
          { label: 'synthetic', score: isFakeFallback ? geminiResult.deepfake_analysis.confidence / 100 : (100 - geminiResult.deepfake_analysis.confidence) / 100 },
          { label: 'human', score: !isFakeFallback ? geminiResult.deepfake_analysis.confidence / 100 : (100 - geminiResult.deepfake_analysis.confidence) / 100 }
        ],
        colabOnline: false,
        model:       'gemini-2.5-flash (In-Model Forensic Fallback)',
        durationMs:  Date.now() - startTime,
        transcription: geminiResult.transcription,
        scam_analysis: geminiResult.scam_analysis,
        emotion_consistency: geminiResult.emotion_consistency,
        notes:       `Audio classification server was offline. Fallback forensic analysis was performed by Gemini. Details: ${geminiResult.deepfake_analysis.details}`
      });
    }

    return NextResponse.json(
      {
        error:   `Audio analysis failed: Colab server offline (${colabError}) and Gemini analysis failed (${geminiError}).`,
        verdict: 'ERROR',
        colabOnline: false,
      },
      { status: 504 },
    );
  }

  logOk('ColabAudio', `verdict=${colabResult.verdict} confidence=${colabResult.confidence}%`);

  if (!geminiResult) {
    logFail('GeminiAudio', geminiError);
  }

  console.log(`[Audio] Completed in ${Date.now() - startTime}ms`);
  console.log('══════ [TruthLens/Audio] Done ══════\n');

  return NextResponse.json({
    verdict:     colabResult.verdict,        // "FAKE" | "REAL" | "ERROR"
    confidence:  colabResult.confidence,     // 0-100
    raw:         colabResult.raw ?? [],      // [{label, score}, ...]
    colabOnline: true,
    model:       'mo-thecreator/Deepfake-audio-detection',
    durationMs:  Date.now() - startTime,
    // Gemini transcript, scam detection and emotion results if available
    transcription: geminiResult?.transcription ?? 'Transcription unavailable',
    scam_analysis: geminiResult?.scam_analysis ?? {
      is_scam: false,
      scam_type: 'None',
      details: geminiError ? `Gemini error: ${geminiError}` : 'No scam or fraud detected.',
      confidence: 100
    },
    emotion_consistency: geminiResult?.emotion_consistency ?? {
      detected_emotion: 'N/A',
      consistency_score: 100,
      explanation: geminiError ? `Gemini error: ${geminiError}` : 'Emotion review unavailable.'
    }
  });
}
