import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const GEMINI_IMAGE_PROMPT = `You are an expert forensic image analyst. Analyze the provided image for signs of AI generation or deepfake manipulation (e.g. SDXL, Midjourney, GANs, face swapping).
Look closely for:
1. Localized facial anomalies (blending, mismatched eyes, ear/jaw asymmetry, blurred boundaries).
2. Fine texture details (plastic skin, unnaturally smooth gradients, hair-strand inconsistencies).
3. Structural/anatomical contradictions (extra fingers, distorted backgrounds, floating objects).
4. Lighting and shadow anomalies.

Respond ONLY with valid JSON. Do not include markdown or text outside the JSON:
{
  "verdict": "FAKE" | "REAL" | "SUSPICIOUS",
  "confidence": <integer 0-100>,
  "reasons": ["reason1", "reason2"],
  "visual_artifacts": ["artifact1", "artifact2"],
  "details": "A detailed technical explanation of your visual forensic findings."
}`;

type ImageReport = {
  verdict_sentence: string;
  plain_language_explanation: string;
  recommended_action: string;
  suggested_scenario: string;
  visual_artifacts: string[];
};

function fallbackReport(
  verdict: 'REAL' | 'FAKE' | 'SUSPICIOUS' | 'UNCERTAIN',
  fakeScore: number,
  modelsRan: number,
): ImageReport {
  if (verdict === 'FAKE') {
    return {
      verdict_sentence: 'This image appears AI-generated.',
      plain_language_explanation: `${modelsRan} detection system${modelsRan > 1 ? 's' : ''} flagged this image as AI-generated with ${Math.round(fakeScore)}% probability.`,
      recommended_action: 'Do not use this image as evidence until it is verified with the original source.',
      suggested_scenario: 'Potential AI-generated or manipulated image.',
      visual_artifacts: [],
    };
  }
  if (verdict === 'SUSPICIOUS') {
    return {
      verdict_sentence: 'This image has suspicious forensic signals.',
      plain_language_explanation: 'The detection signals were mixed, so the image should be treated as unverified.',
      recommended_action: 'Verify this image with reverse image search and trusted source material before acting on it.',
      suggested_scenario: 'Possible AI-generated or edited image.',
      visual_artifacts: [],
    };
  }
  return {
    verdict_sentence: 'This image appears authentic.',
    plain_language_explanation: `${modelsRan} detection system${modelsRan > 1 ? 's' : ''} found no strong signs of AI generation.`,
    recommended_action: 'The image appears low risk, but important content should still be checked against trusted sources.',
    suggested_scenario: 'Likely authentic image.',
    visual_artifacts: [],
  };
}

async function generateGeminiImageReport({
  bytes,
  mimeType,
  verdict,
  fakeScore,
  realScore,
  modelsRan,
  modelResults,
}: {
  bytes: ArrayBuffer;
  mimeType: string;
  verdict: 'REAL' | 'FAKE' | 'SUSPICIOUS' | 'UNCERTAIN';
  fakeScore: number;
  realScore: number;
  modelsRan: number;
  modelResults: {
    model: string;
    modelId: string;
    verdict: 'FAKE' | 'REAL' | null;
    confidence: number;
    rawLabel: string;
    ran: boolean;
  }[];
}): Promise<ImageReport> {
  const prompt = `Write the user-facing forensic report for this image.

Use these model results as the primary evidence:
- Final verdict: ${verdict}
- AI probability: ${Math.round(fakeScore)}%
- Authentic probability: ${Math.round(realScore)}%
- Models ran: ${modelsRan}
- Model breakdown: ${JSON.stringify(modelResults)}

Return ONLY valid JSON:
{
  "verdict_sentence": "one short sentence",
  "plain_language_explanation": "2-3 concise sentences explaining the evidence",
  "recommended_action": "one practical action sentence",
  "suggested_scenario": "one concise scenario sentence",
  "visual_artifacts": ["short artifact phrase", "short artifact phrase"]
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

    const text = (response.text ?? '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(text) as Partial<ImageReport>;
    return {
      ...fallbackReport(verdict, fakeScore, modelsRan),
      ...parsed,
      visual_artifacts: Array.isArray(parsed.visual_artifacts) ? parsed.visual_artifacts : [],
    };
  } catch (e) {
    console.error('[Image][GeminiReport] failed:', e);
    return fallbackReport(verdict, fakeScore, modelsRan);
  }
}

// ─── Models ────────────────────────────────────────────────────────────────────
// All three are confirmed on HuggingFace Inference API (serverless, free tier).
// Raw bytes are posted directly — no SDK needed for image inference.
const HF_TOKEN = process.env.HF_TOKEN!;

const MODELS = [
  {
    id:     'prithivMLmods/deepfake-detector-model-v1',
    name:   'SigLIP2 Deepfake Detector',
    weight: 1.3,   // highest weight — SigLIP2 backbone, best resolution
  },
  {
    id:     'Organika/sdxl-detector',
    name:   'SDXL Detector',
    weight: 1.0,
  },
  {
    id:     'haywoodsloan/ai-image-detector-dev-deploy',
    name:   'AI Image Detector',
    weight: 1.0,
  },
] as const;

// ─── Structured logger ─────────────────────────────────────────────────────────
function logRun(model: string)                    { console.log (`[Image][RUN ▶] ${model}`); }
function logOk (model: string, detail: string)   { console.log (`[Image][OK  ✅] ${model} → ${detail}`); }
function logFail(model: string, err: unknown)    { console.error(`[Image][FAIL ❌] ${model} → ${String(err).slice(0, 200)}`); }

// ─── HF Inference call ────────────────────────────────────────────────────────
async function queryModel(
  modelId: string,
  imageBytes: ArrayBuffer,
  mimeType: string,
): Promise<{ label: string; score: number }[] | null> {
  logRun(modelId);
  try {
    const res = await fetch(
      `https://router.huggingface.co/hf-inference/models/${modelId}`,
      {
        method:  'POST',
        headers: { 
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': mimeType,
        },
        body:    Buffer.from(imageBytes),
        signal:  AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok) {
      logFail(modelId, `HTTP ${res.status} ${await res.text().then(t => t.slice(0, 120))}`);
      return null;
    }
    const data = await res.json() as { label: string; score: number }[];
    logOk(modelId, JSON.stringify(data).slice(0, 120));
    return data;
  } catch (e) {
    logFail(modelId, e);
    return null;
  }
}

// ─── Label normaliser ─────────────────────────────────────────────────────────
// Different models use different label strings — map them all to FAKE | REAL | null
function normalizeLabel(label: string): 'FAKE' | 'REAL' | null {
  const l = label.toUpperCase();
  if (['FAKE', 'ARTIFICIAL', 'AI_GENERATED', 'AI-GENERATED',
       'MIDJOURNEY', 'SD', 'SDXL', 'DEEPFAKE', 'GENERATED'].some(x => l.includes(x)))
    return 'FAKE';
  if (['REAL', 'HUMAN', 'GENUINE', 'AUTHENTIC'].some(x => l.includes(x)))
    return 'REAL';
  return null;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  console.log('\n══════ [TruthLens/Image] Analysis Started ══════');

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

  const mimeType = file.type || 'image/png';
  const bytes = await file.arrayBuffer();

  // Run all 3 models in parallel — no waterfall, no fallbacks
  const [r0, r1, r2] = await Promise.all(MODELS.map(m => queryModel(m.id, bytes, mimeType)));
  const responses = [r0, r1, r2];

  const modelResults: {
    model: string;
    modelId: string;
    verdict: 'FAKE' | 'REAL' | null;
    confidence: number;
    rawLabel: string;
    ran: boolean;
  }[] = [];

  for (let i = 0; i < MODELS.length; i++) {
    const res = responses[i];
    if (!res || !Array.isArray(res) || res.length === 0) {
      modelResults.push({ model: MODELS[i].name, modelId: MODELS[i].id, verdict: null, confidence: 0, rawLabel: 'ERROR', ran: false });
      continue;
    }
    const top     = res[0];
    const verdict = normalizeLabel(top.label);
    const score   = top.score;

    modelResults.push({
      model:      MODELS[i].name,
      modelId:    MODELS[i].id,
      verdict,
      confidence: Math.round(score * 100),
      rawLabel:   top.label,
      ran:        true,
    });
  }

  const successfulRuns = modelResults.filter(r => r.ran).length;

  // ── Fallback if all sub-models failed (e.g. offline HF API) ───────────────
  if (successfulRuns === 0) {
    console.log('[Image] HuggingFace models offline/failed. Routing to Gemini fallback forensic analyzer...');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{
          parts: [
            { inlineData: { mimeType, data: Buffer.from(bytes).toString('base64') } },
            { text: GEMINI_IMAGE_PROMPT }
          ]
        }]
      });

      const text = (response.text ?? '').trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(text) as {
        verdict: 'REAL' | 'FAKE' | 'SUSPICIOUS';
        confidence: number;
        reasons: string[];
        visual_artifacts: string[];
        details: string;
      };

      console.log(`[Image][Fallback] Gemini forensic result: verdict=${parsed.verdict} confidence=${parsed.confidence}%`);

      // Mock sub-model results using Gemini forensic findings
      const fallbackResults = MODELS.map(m => ({
        model: m.name,
        modelId: m.id,
        verdict: parsed.verdict,
        confidence: parsed.confidence,
        rawLabel: `GEMINI_FALLBACK_${parsed.verdict}`,
        ran: true
      }));

      const fakeVal = parsed.verdict === 'FAKE' ? parsed.confidence : parsed.verdict === 'REAL' ? 100 - parsed.confidence : 50;
      const realVal = parsed.verdict === 'REAL' ? parsed.confidence : parsed.verdict === 'FAKE' ? 100 - parsed.confidence : 50;

      console.log('══════ [TruthLens/Image] Fallback Done ══════\n');

      return NextResponse.json({
        verdict:        parsed.verdict,
        confidence:     parsed.confidence,
        fakeScore:      fakeVal,
        realScore:      realVal,
        modelsRan:      1,
        modelsFailed:   MODELS.length,
        models:         fallbackResults,
        durationMs:     Date.now() - startTime,
        report: {
          verdict_sentence:
            parsed.verdict === 'FAKE'
              ? 'This image appears AI-generated.'
              : parsed.verdict === 'SUSPICIOUS'
                ? 'This image has suspicious forensic signals.'
                : 'This image appears authentic.',
          plain_language_explanation: parsed.details,
          recommended_action:
            parsed.verdict === 'REAL'
              ? 'The image appears low risk, but important content should still be checked against trusted sources.'
              : 'Do not use this image as evidence until it is verified with the original source.',
          suggested_scenario:
            parsed.verdict === 'REAL'
              ? 'Likely authentic image.'
              : 'Potential AI-generated or manipulated image.',
          visual_artifacts: parsed.visual_artifacts ?? parsed.reasons ?? [],
        },
        notes:          `Hugging Face sub-models were offline. Fallback forensic analysis was performed by Gemini. Details: ${parsed.details}`
      });
    } catch (e) {
      console.error('[Image][Fallback] Gemini image fallback failed:', e);
      return NextResponse.json({
        verdict:        'UNCERTAIN',
        confidence:     50,
        fakeScore:      50,
        realScore:      50,
        modelsRan:      0,
        modelsFailed:   MODELS.length,
        models:         modelResults,
        durationMs:     Date.now() - startTime,
        error:          `All sub-models failed and fallback was unavailable: ${String(e)}`
      });
    }
  }

  // ── Aggregate (Consensus-Based) ───────────────────────────────────────────
  let fakeScore = 0;
  let realScore = 0;
  let finalVerdict: 'FAKE' | 'REAL' | 'SUSPICIOUS' | 'UNCERTAIN';
  const fakeVotes = modelResults.filter(r => r.verdict === 'FAKE').length;

  if (fakeVotes >= 2) {
    finalVerdict = 'FAKE';
    // Consensus fake score: weighted average of the models that voted FAKE
    const fakeModels = modelResults.filter(r => r.verdict === 'FAKE');
    const totalFakeWeight = fakeModels.reduce((sum, r) => {
      const m = MODELS.find(x => x.id === r.modelId);
      return sum + (m ? m.weight : 1.0);
    }, 0);
    const weightedFakeSum = fakeModels.reduce((sum, r) => {
      const m = MODELS.find(x => x.id === r.modelId);
      return sum + (r.confidence * (m ? m.weight : 1.0));
    }, 0);
    fakeScore = totalFakeWeight > 0 ? weightedFakeSum / totalFakeWeight : 0;
    realScore = 100 - fakeScore;
  } else if (fakeVotes === 0) {
    finalVerdict = 'REAL';
    // Consensus real score: weighted average of the models that voted REAL
    const realModels = modelResults.filter(r => r.verdict === 'REAL');
    const totalRealWeight = realModels.reduce((sum, r) => {
      const m = MODELS.find(x => x.id === r.modelId);
      return sum + (m ? m.weight : 1.0);
    }, 0);
    const weightedRealSum = realModels.reduce((sum, r) => {
      const m = MODELS.find(x => x.id === r.modelId);
      return sum + (r.confidence * (m ? m.weight : 1.0));
    }, 0);
    realScore = totalRealWeight > 0 ? weightedRealSum / totalRealWeight : 0;
    fakeScore = 100 - realScore;
  } else {
    // SUSPICIOUS (mixed votes, e.g. 1 FAKE and 2 REAL)
    finalVerdict = 'SUSPICIOUS';
    // Probability of AI generation is the weighted average across all models
    let weightedFakeProbSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < MODELS.length; i++) {
      const mr = modelResults[i];
      if (!mr.ran) continue;
      const weight = MODELS[i].weight;
      const fakeProb = mr.verdict === 'FAKE' ? mr.confidence : 100 - mr.confidence;
      weightedFakeProbSum += fakeProb * weight;
      totalWeight += weight;
    }
    fakeScore = totalWeight > 0 ? weightedFakeProbSum / totalWeight : 50;
    realScore = 100 - fakeScore;
  }

  const confidence = Math.round(Math.max(fakeScore, realScore));

  console.log(
    `[Image] verdict=${finalVerdict} fakeScore=${fakeScore.toFixed(1)}% ` +
    `fakeVotes=${fakeVotes}/${successfulRuns} ran in ${Date.now() - startTime}ms`,
  );
  console.log('══════ [TruthLens/Image] Done ══════\n');

  const report = await generateGeminiImageReport({
    bytes,
    mimeType,
    verdict: finalVerdict,
    fakeScore,
    realScore,
    modelsRan: successfulRuns,
    modelResults,
  });

  return NextResponse.json({
    verdict:        finalVerdict,
    confidence:     confidence,
    fakeScore:      Math.round(fakeScore),
    realScore:      Math.round(realScore),
    modelsRan:      successfulRuns,
    modelsFailed:   MODELS.length - successfulRuns,
    models:         modelResults,
    report,
    durationMs:     Date.now() - startTime,
  });
}
