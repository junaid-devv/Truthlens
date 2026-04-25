import { HfInference } from '@huggingface/inference';

// Use no token for public access
const hf = new HfInference();

const testAudioUrl = 'https://huggingface.co/datasets/Narsil/asr_dummy/resolve/main/1.flac';

async function testModel(modelId) {
  try {
    const response = await fetch(testAudioUrl);
    const blob = await response.blob();
    const res = await hf.audioClassification({
      model: modelId,
      data: blob
    });
    console.log(`✅ ${modelId}: WORKING`);
    return true;
  } catch (err) {
    console.log(`❌ ${modelId}: FAILED - ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing Audio Deepfake Models...');
  const deepfakeModels = [
    'aaraki/wav2vec2-base-finetuned-deepfake',
    'Melina/deepfake-audio-detection',
    'Mihaiii/deepfake-audio-detection',
    'superb/wav2vec2-base-superb-ks',
    'johnweller/wav2vec2-large-xlsr-53-deepfake',
    'samitizer/wav2vec2-base-finetuned-deepfake',
    'dima806/deepfake_vs_real_audio_detection', 
    'alefiury/wav2vec2-large-xlsr-53-gender-recognition-from-speech',
    'facebook/wav2vec2-large-960h-lv60-self'
  ];

  for (const m of deepfakeModels) {
    await testModel(m);
  }

  console.log('\nTesting Emotion Models...');
  const emotionModels = [
    'superb/hubert-large-superb-er',
    'superb/wav2vec2-base-superb-er',
    'j-hartmann/emotion-english-distilroberta-base',
    'MIT/ast-finetuned-audioset-10-10-0.4593',
    'harshit345/xlsr-wav2vec-speech-emotion-recognition',
    'dima806/speech_emotion_recognition',
    'ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition'
  ];

  for (const m of emotionModels) {
    await testModel(m);
  }
}

main();
