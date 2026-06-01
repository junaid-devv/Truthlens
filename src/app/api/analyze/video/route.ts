import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// ─── Gemini 2.5 Flash + Files API ─────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.5-flash';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

function logRun(step: string)               { console.log (`[Video][RUN ▶] ${step}`); }
function logOk (step: string, d: string)   { console.log (`[Video][OK  ✅] ${step} → ${d}`); }
function logFail(step: string, e: unknown) { console.error(`[Video][FAIL ❌] ${step} → ${String(e).slice(0, 200)}`); }

const SYSTEM_PROMPT = `You are a forensic media analyst specializing in deepfake, voice cloning, and scam/fraud detection.
Analyze the provided video for ALL of the following:
1. Facial deepfake artifacts — unnatural blending, edge artifacts, flickering around face
2. Lip-sync mismatches — audio not matching mouth movements
3. Eye/blink anomalies — unnatural blinking or eye movement
4. Temporal inconsistencies — visual glitches between frames
5. AI-generated visual patterns — unnaturally smooth skin, lighting inconsistencies
6. Audio anomalies — synthetic or cloned voice characteristics, unnatural prosody
7. Scam, fraud, or social engineering indicators — Check if the video/audio content attempts to defraud, mislead, or exploit viewers (e.g., via fake giveaway promotions, urgency, requests for money/crypto transfers, tech support impersonation, celebrity voice/face cloning scams, phishing, romance fraud).

Respond ONLY with valid JSON. No markdown. No text outside the JSON object:
{
  "verdict": "REAL" | "FAKE" | "SUSPICIOUS",
  "confidence": <integer 0-100>,
  "probability_fake": <integer 0-100>,
  "reasons": ["reason1", "reason2"],
  "visual_artifacts": ["artifact1", "artifact2"],
  "audio_artifacts": ["artifact1", "artifact2"],
  "fake_segments": [{"start_sec": 0, "end_sec": 5, "issue": "description"}],
  "audio_verdict": "REAL" | "FAKE" | "SUSPICIOUS" | "NO_AUDIO",
  "detected_emotion": "string",
  "face_match": "Name or No strong match",
  "notes": "string",
  "transcription": "string",
  "scam_analysis": {
    "is_scam": <boolean>,
    "scam_type": "Voice cloning scam" | "Financial fraud" | "Impersonation" | "Phishing" | "Deceptive offer" | "None" | "Other (specify)",
    "details": "A detailed analysis explaining why the video content/audio is classified as a scam or safe.",
    "confidence": <integer 0-100>
  }
}`;

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('\n══════ [TruthLens/Video] Analysis Started ══════');

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const mimeType = file.type || 'video/mp4';

  // ── Step 1: Upload to Gemini Files API ────────────────────────────────────
  logRun(`Gemini Files API upload [${file.name}, ${(file.size / 1024 / 1024).toFixed(1)}MB]`);
  let uploadedFile: Awaited<ReturnType<typeof ai.files.upload>>;
  try {
    const arrayBuffer = await file.arrayBuffer();
    uploadedFile = await ai.files.upload({
      file:   new Blob([arrayBuffer], { type: mimeType }),
      config: { mimeType, displayName: file.name },
    });
    logOk('FilesAPI Upload', `name=${uploadedFile.name} state=${uploadedFile.state}`);
  } catch (e) {
    logFail('FilesAPI Upload', e);
    return NextResponse.json({ error: 'Failed to upload video to Gemini Files API', verdict: 'ERROR' }, { status: 500 });
  }

  // ── Step 2: Poll until ACTIVE ─────────────────────────────────────────────
  logRun(`Polling file state [${uploadedFile.name}]`);
  let fileState = uploadedFile;
  const pollStart = Date.now();
  while (fileState.state === 'PROCESSING') {
    if (Date.now() - pollStart > 120_000) {
      logFail('FilesAPI Poll', 'Timed out after 120s waiting for ACTIVE state');
      return NextResponse.json({ error: 'Video processing timed out', verdict: 'ERROR' }, { status: 504 });
    }
    await new Promise(r => setTimeout(r, 2_000));
    fileState = await ai.files.get({ name: uploadedFile.name! });
    console.log(`[Video][POLL] state=${fileState.state}`);
  }

  if (fileState.state === 'FAILED') {
    logFail('FilesAPI Poll', `File entered FAILED state`);
    return NextResponse.json({ error: 'Gemini file processing failed', verdict: 'ERROR' }, { status: 500 });
  }
  logOk('FilesAPI Poll', `state=${fileState.state} uri=${fileState.uri}`);

  // ── Step 3: Analyze with Gemini 2.5 Flash ────────────────────────────────
  logRun(`${GEMINI_MODEL} / video forensic analysis`);
  try {
    const response = await ai.models.generateContent({
      model:    GEMINI_MODEL,
      contents: [{
        parts: [
          { fileData: { mimeType, fileUri: fileState.uri! } },
          { text: SYSTEM_PROMPT },
        ],
      }],
    });

    const text = (response.text ?? '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    logOk(GEMINI_MODEL, `raw response length=${text.length}`);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      console.error('[Video][FAIL ❌] JSON parse failed — raw:', text.slice(0, 300));
      return NextResponse.json({
        verdict: 'SUSPICIOUS',
        confidence: 50,
        probability_fake: 50,
        reasons: ['Could not parse Gemini analysis — review manually'],
        raw: text,
      });
    }

    logOk(GEMINI_MODEL, `verdict=${parsed.verdict} confidence=${parsed.confidence}%`);
    console.log(`[Video] Completed in ${Date.now() - startTime}ms`);
    console.log('══════ [TruthLens/Video] Done ══════\n');

    return NextResponse.json({
      ...parsed,
      model:      GEMINI_MODEL,
      durationMs: Date.now() - startTime,
    });
  } catch (e) {
    logFail(GEMINI_MODEL, e);
    return NextResponse.json({ error: String(e), verdict: 'ERROR' }, { status: 500 });
  }
}
