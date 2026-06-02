import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const COLAB_IMAGE_URL = (
  process.env.COLAB_IMAGE_URL ||
  process.env.COLAB_AUDIO_URL ||
  ''
).replace(/\/$/, '');

type Verdict = 'REAL' | 'FAKE' | 'SUSPICIOUS' | 'UNCERTAIN';

type ModelResult = {
  model: string;
  modelId: string;
  verdict: Verdict | null;
  confidence: number;
  rawLabel: string;
  ran: boolean;
};

type ImageReport = {
  verdict_sentence: string;
  plain_language_explanation: string;
  recommended_action: string;
  suggested_scenario: string;
  visual_artifacts: string[];
  source_match?: string;
  source_interpretation?: string;
  source?: 'gemini' | 'fallback';
};

type ColabImageResponse = {
  verdict?: Verdict | 'ERROR';
  confidence?: number;
  fake_probability?: number;
  real_probability?: number;
  ai_verdict?: Verdict | 'ERROR';
  ai_fake_probability?: number;
  ai_real_probability?: number;
  face_verdict?: Verdict | 'ERROR';
  face_fake_probability?: number;
  face_real_probability?: number;
  face_found?: boolean;
  face_box?: [number, number, number, number] | null;
  model?: string;
  model_id?: string;
  raw?: { label: string; score: number }[];
  error?: string;
};

const AI_MODEL_NAME = 'ConvNeXt AI Image Detector';
const AI_MODEL_ID = 'xRayon/convnext-ai-images-detector';
const FACE_MODEL_NAME = 'Yermandy Face Forgery Detector';
const FACE_MODEL_ID = 'yermandy/deepfake-detection';

function fallbackReport(
  verdict: Verdict,
  fakeScore: number,
  faceFound: boolean,
): ImageReport {
  if (!faceFound) {
    return {
      verdict_sentence:
        verdict === 'FAKE'
          ? 'This image shows signs of AI generation.'
          : verdict === 'SUSPICIOUS'
            ? 'This image has suspicious AI-generation signals.'
            : 'No strong AI-generation signal was detected.',
      plain_language_explanation:
        verdict === 'FAKE'
          ? `The full-image detector estimated a ${Math.round(fakeScore)}% AI-generation probability. No face was detected, so face-swap analysis was skipped.`
          : 'The full-image detector completed analysis. No face was detected, so face-swap analysis was skipped.',
      recommended_action:
        verdict === 'FAKE' || verdict === 'SUSPICIOUS'
          ? 'Verify the image with the original source before sharing or using it as evidence.'
          : 'The image is low risk from the available detector, but important content should still be source-checked.',
      suggested_scenario:
        verdict === 'FAKE'
          ? 'Possible AI-generated image.'
          : 'Face-forgery analysis was not applicable.',
      visual_artifacts: verdict === 'FAKE' ? ['Full-image AI-generation detector flagged the image'] : [],
      source_match: 'Identity not verified',
      source_interpretation:
        'This app does not perform biometric public-figure identification. Verify any claimed identity through trusted source material.',
      source: 'fallback',
    };
  }

  if (verdict === 'FAKE') {
    return {
      verdict_sentence: 'This image shows signs of AI generation or face manipulation.',
      plain_language_explanation: `The strongest image detector estimated a ${Math.round(fakeScore)}% manipulation or AI-generation probability.`,
      recommended_action:
        'Do not trust this image as identity evidence until it is verified against the original source.',
      suggested_scenario: 'Possible face swap or facial deepfake.',
      visual_artifacts: ['Face-forgery model flagged the detected face'],
      source_match: 'Identity not verified',
      source_interpretation:
        'The face region was suspicious. Treat any claimed public-figure identity as unverified unless confirmed by an official source.',
      source: 'fallback',
    };
  }

  if (verdict === 'SUSPICIOUS') {
    return {
      verdict_sentence: 'The face-forgery result is suspicious but not conclusive.',
      plain_language_explanation:
        'The detector found mixed evidence, so this image should be treated as unverified rather than clearly fake.',
      recommended_action:
        'Verify with the original source, reverse image search, and additional forensic checks.',
      suggested_scenario: 'Possible facial manipulation or degraded image quality.',
      visual_artifacts: ['Borderline face-forgery score'],
      source_match: 'Identity not verified',
      source_interpretation:
        'The analysis cannot confirm who the person is. Verify the claimed identity with original source media.',
      source: 'fallback',
    };
  }

  return {
    verdict_sentence: 'No strong face-forgery signal was detected.',
    plain_language_explanation:
      'The face detector found a face, and the forgery model did not find strong manipulation evidence.',
    recommended_action:
      'The face analysis is low risk, but important images should still be verified through trusted sources.',
    suggested_scenario: 'Likely authentic face region.',
    visual_artifacts: [],
    source_match: 'Identity not verified',
    source_interpretation:
      'No identity database or biometric public-figure matching is connected to this app.',
    source: 'fallback',
  };
}

async function generateGeminiImageReport({
  bytes,
  mimeType,
  verdict,
  fakeScore,
  realScore,
  faceFound,
  modelResults,
}: {
  bytes: ArrayBuffer;
  mimeType: string;
  verdict: Verdict;
  fakeScore: number;
  realScore: number;
  faceFound: boolean;
  modelResults: ModelResult[];
}): Promise<ImageReport> {
  const prompt = `Write the user-facing forensic report for this image.

Use the detector output as the primary evidence. Do not overclaim. The full-image detector checks AI-generated images; the face detector checks face forgery/deepfake manipulation when a face is present.
Do not identify or name a person in the image. You may assess whether the image presents an impersonation/source-verification risk.

- Final verdict: ${verdict}
- Face detected: ${faceFound ? 'yes' : 'no'}
- Combined AI/manipulation probability: ${Math.round(fakeScore)}%
- Combined authentic probability: ${Math.round(realScore)}%
- Model breakdown: ${JSON.stringify(modelResults)}

Return ONLY valid JSON:
{
  "verdict_sentence": "one short sentence",
  "plain_language_explanation": "2 concise sentences explaining the evidence",
  "recommended_action": "one practical action sentence",
  "suggested_scenario": "one concise scenario sentence",
  "visual_artifacts": ["short artifact phrase", "short artifact phrase"],
  "source_match": "Identity not verified | Public-figure impersonation risk | No public figure claim verified",
  "source_interpretation": "one sentence explaining source/identity verification risk without naming a person"
}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{
        parts: [
          { inlineData: { mimeType, data: Buffer.from(bytes).toString('base64') } },
          { text: prompt },
        ],
      }],
    });

    const text = (response.text ?? '')
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const parsed = JSON.parse(text) as Partial<ImageReport>;

    return {
      ...fallbackReport(verdict, fakeScore, faceFound),
      ...parsed,
      visual_artifacts: Array.isArray(parsed.visual_artifacts)
        ? parsed.visual_artifacts
        : fallbackReport(verdict, fakeScore, faceFound).visual_artifacts,
      source: 'gemini',
    };
  } catch (error) {
    console.error('[Image][GeminiReport] failed:', error);
    return fallbackReport(verdict, fakeScore, faceFound);
  }
}

function normalizeColabVerdict(
  verdict: ColabImageResponse['verdict'],
  fakeProbability: number,
): Verdict {
  if (verdict === 'FAKE' || verdict === 'REAL' || verdict === 'SUSPICIOUS') return verdict;
  if (fakeProbability >= 70) return 'FAKE';
  if (fakeProbability <= 30) return 'REAL';
  return 'SUSPICIOUS';
}

async function queryColabImage(file: File): Promise<ColabImageResponse> {
  if (!COLAB_IMAGE_URL) {
    throw new Error('COLAB_IMAGE_URL or COLAB_AUDIO_URL is not configured.');
  }

  const formData = new FormData();
  formData.append('file', file, file.name);

  const health = await fetch(`${COLAB_IMAGE_URL}/health`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });

  if (!health.ok) {
    throw new Error(`Colab health check failed with HTTP ${health.status}.`);
  }

  const response = await fetch(`${COLAB_IMAGE_URL}/analyze/image`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`Colab image analysis failed with HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  return response.json() as Promise<ColabImageResponse>;
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const mimeType = file.type || 'image/png';
  const bytes = await file.arrayBuffer();
  const forwardedFile = new File([bytes], file.name, { type: mimeType });

  try {
    console.log(`[Image][RUN] ${COLAB_IMAGE_URL}/analyze/image [models: ${AI_MODEL_ID}, ${FACE_MODEL_ID}]`);
    const colab = await queryColabImage(forwardedFile);

    if (colab.verdict === 'ERROR') {
      throw new Error(colab.error || 'Colab image model returned ERROR.');
    }

    const faceFound = Boolean(colab.face_found);
    const fakeScore = Math.round(colab.fake_probability ?? 50);
    const realScore = Math.round(colab.real_probability ?? (100 - fakeScore));
    const verdict = normalizeColabVerdict(colab.verdict, fakeScore);
    const confidence = Math.round(colab.confidence ?? Math.max(fakeScore, realScore));

    const aiFake = Math.round(colab.ai_fake_probability ?? fakeScore);
    const aiVerdict = normalizeColabVerdict(colab.ai_verdict, aiFake);
    const faceFake = Math.round(colab.face_fake_probability ?? 50);
    const faceVerdict = faceFound ? normalizeColabVerdict(colab.face_verdict, faceFake) : null;

    const modelResults: ModelResult[] = [
      {
        model: AI_MODEL_NAME,
        modelId: AI_MODEL_ID,
        verdict: aiVerdict,
        confidence: Math.round(Math.max(aiFake, colab.ai_real_probability ?? (100 - aiFake))),
        rawLabel: 'AI_GENERATED_IMAGE_CHECK',
        ran: true,
      },
      {
        model: FACE_MODEL_NAME,
        modelId: FACE_MODEL_ID,
        verdict: faceVerdict,
        confidence: faceFound
          ? Math.round(Math.max(faceFake, colab.face_real_probability ?? (100 - faceFake)))
          : 0,
        rawLabel: faceFound ? 'FACE_FORGERY_CHECK' : 'NO_FACE_DETECTED',
        ran: faceFound,
      },
    ];

    const report = await generateGeminiImageReport({
      bytes,
      mimeType,
      verdict,
      fakeScore,
      realScore,
      faceFound,
      modelResults,
    });

    console.log(`[Image][OK] verdict=${verdict} fakeScore=${fakeScore}% face=${faceFound}`);

    return NextResponse.json({
      verdict,
      confidence,
      fakeScore,
      realScore,
      modelsRan: modelResults.filter((model) => model.ran).length,
      modelsFailed: modelResults.filter((model) => !model.ran).length,
      models: modelResults,
      report,
      durationMs: Date.now() - startedAt,
      face_found: faceFound,
      face_box: colab.face_box ?? null,
      image_dimensions: await sharp(Buffer.from(bytes))
        .metadata()
        .then((metadata) => ({
          width: metadata.width ?? null,
          height: metadata.height ?? null,
        }))
        .catch(() => ({ width: null, height: null })),
    });
  } catch (error) {
    console.error('[Image][FAIL]', error);
    const errorLabel = `COLAB_ERROR: ${String(error).slice(0, 160)}`;
    const modelResults: ModelResult[] = [
      {
        model: AI_MODEL_NAME,
        modelId: AI_MODEL_ID,
        verdict: null,
        confidence: 0,
        rawLabel: errorLabel,
        ran: false,
      },
      {
        model: FACE_MODEL_NAME,
        modelId: FACE_MODEL_ID,
        verdict: null,
        confidence: 0,
        rawLabel: errorLabel,
        ran: false,
      },
    ];

    return NextResponse.json({
      verdict: 'UNCERTAIN',
      confidence: 50,
      fakeScore: 50,
      realScore: 50,
      modelsRan: 0,
      modelsFailed: modelResults.length,
      models: modelResults,
      report: fallbackReport('UNCERTAIN', 50, false),
      durationMs: Date.now() - startedAt,
      error: String(error),
    });
  }
}
