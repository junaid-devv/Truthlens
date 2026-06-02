# ==============================================================================
# TRUTHLENS AUDIO + IMAGE ANALYZER PIPELINE (GOOGLE COLAB - T4 GPU RUNTIME)
# ==============================================================================
#
# In Colab, run this install command before this script/cell:
# !pip install transformers torch torchaudio torchvision timm fastapi uvicorn pyngrok python-multipart nest-asyncio huggingface_hub pillow opencv-python-headless -q
#
# This pipeline exposes:
# - /analyze/audio: audio deepfake detection
# - /analyze/image: full-image AI generation + face-forgery detection
# - /health: runtime/model health

import contextlib
import os
import tempfile

import cv2
import nest_asyncio
import numpy as np
import timm
import torch
import torch.nn.functional as F
import torchvision.transforms as transforms
import uvicorn
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from huggingface_hub import hf_hub_download
from PIL import Image
from pyngrok import ngrok
from transformers import CLIPProcessor, pipeline


DEVICE_ID = 0 if torch.cuda.is_available() else -1
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
DTYPE = torch.float16 if torch.cuda.is_available() else torch.float32
FACE_DTYPE = torch.bfloat16

print(f"Device configuration: {'T4 GPU' if DEVICE_ID == 0 else 'CPU (no GPU assigned)'}")
torch.set_float32_matmul_precision("high")


print("Loading audio classifier model...")
audio_pipe = pipeline(
    "audio-classification",
    model="mo-thecreator/Deepfake-audio-detection",
    device=DEVICE_ID,
)
print("Audio model loaded.")


AI_IMAGE_MODEL_ID = "xRayon/convnext-ai-images-detector"
AI_IMAGE_MODEL_FILE = "AI Images Detector/checkpoints/checkpoint_phase2.pth"

print("Loading full-image AI-generation detector...")
ai_image_model_path = hf_hub_download(
    repo_id=AI_IMAGE_MODEL_ID,
    filename=AI_IMAGE_MODEL_FILE,
    local_dir="weights",
)
ai_image_model = timm.create_model(
    "convnextv2_base",
    pretrained=False,
    num_classes=2,
)
ai_image_ckpt = torch.load(ai_image_model_path, map_location="cpu")
ai_image_state = ai_image_ckpt["model"] if isinstance(ai_image_ckpt, dict) and "model" in ai_image_ckpt else ai_image_ckpt
ai_image_model.load_state_dict(ai_image_state)
ai_image_model.eval()
ai_image_model = ai_image_model.to(DEVICE).to(DTYPE)
ai_image_transform = transforms.Compose([
    transforms.Resize(288),
    transforms.CenterCrop(256),
    transforms.ToTensor(),
    transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
])
print("Full-image AI-generation detector loaded.")


FACE_MODEL_ID = "yermandy/deepfake-detection"
FACE_MODEL_FILE = "model.torchscript"

print("Loading face-forgery detector...")
face_model_path = hf_hub_download(
    repo_id=FACE_MODEL_ID,
    filename=FACE_MODEL_FILE,
    local_dir="weights",
)
face_model = torch.jit.load(face_model_path, map_location=DEVICE)
face_model.eval()
face_model = face_model.to(DEVICE).to(FACE_DTYPE)
clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")
print("Face-forgery detector loaded.")


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_audio_label(label: str) -> str:
    lbl = label.upper()
    if lbl in ["FAKE", "SPOOF", "LABEL_0"] or "FAKE" in lbl or "SPOOF" in lbl:
        return "FAKE"
    if lbl in ["REAL", "BONAFIDE", "LABEL_1"] or "REAL" in lbl or "BONAFIDE" in lbl:
        return "REAL"
    return "REAL"


def verdict_from_fake_probability(fake_probability: float):
    if fake_probability >= 70:
        return "FAKE"
    if fake_probability <= 30:
        return "REAL"
    return "SUSPICIOUS"


def detect_largest_face(image: Image.Image):
    rgb = image.convert("RGB")
    frame = np.array(rgb)
    gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)

    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    detector = cv2.CascadeClassifier(cascade_path)
    faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(48, 48))

    if len(faces) == 0:
        return None, None

    x, y, w, h = max(faces, key=lambda box: box[2] * box[3])
    margin = int(max(w, h) * 0.25)
    left = max(0, x - margin)
    top = max(0, y - margin)
    right = min(rgb.width, x + w + margin)
    bottom = min(rgb.height, y + h + margin)

    return rgb.crop((left, top, right, bottom)), [int(left), int(top), int(right), int(bottom)]


def autocast_context():
    if torch.cuda.is_available():
        return torch.autocast(device_type="cuda", dtype=DTYPE)
    return contextlib.nullcontext()


def classify_ai_generated_image(image: Image.Image):
    image_tensor = ai_image_transform(image.convert("RGB")).unsqueeze(0).to(DEVICE).to(DTYPE)

    with torch.no_grad():
        with autocast_context():
            logits = ai_image_model(image_tensor)
            probabilities = F.softmax(logits, dim=1).detach().cpu()[0]

    real_probability = float(probabilities[0]) * 100
    fake_probability = float(probabilities[1]) * 100

    return {
        "verdict": verdict_from_fake_probability(fake_probability),
        "confidence": int(round(max(real_probability, fake_probability))),
        "fake_probability": int(round(fake_probability)),
        "real_probability": int(round(real_probability)),
        "raw": [
            {"label": "AI_GENERATED", "score": fake_probability / 100},
            {"label": "REAL_PHOTO", "score": real_probability / 100},
        ],
    }


def classify_face_forgery(face_image: Image.Image):
    pixel_values = clip_processor(images=face_image.convert("RGB"), return_tensors="pt")["pixel_values"]
    pixel_values = pixel_values.to(DEVICE).to(FACE_DTYPE)

    with torch.no_grad():
        with torch.autocast(device_type="cuda", dtype=FACE_DTYPE) if torch.cuda.is_available() else contextlib.nullcontext():
            logits = face_model(pixel_values)
            probabilities = logits.softmax(dim=1).detach().cpu()[0]

    real_probability = float(probabilities[0]) * 100
    fake_probability = float(probabilities[1]) * 100

    return {
        "verdict": verdict_from_fake_probability(fake_probability),
        "confidence": int(round(max(real_probability, fake_probability))),
        "fake_probability": int(round(fake_probability)),
        "real_probability": int(round(real_probability)),
        "raw": [
            {"label": "FACE_FORGERY", "score": fake_probability / 100},
            {"label": "REAL_FACE", "score": real_probability / 100},
        ],
    }


@app.get("/health")
def health():
    return {
        "status": "online",
        "gpu": torch.cuda.is_available(),
        "device": DEVICE,
        "audio_model": "mo-thecreator/Deepfake-audio-detection",
        "ai_image_model": AI_IMAGE_MODEL_ID,
        "face_forgery_model": FACE_MODEL_ID,
    }


@app.post("/analyze/audio")
async def analyze_audio(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[-1] or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        results = audio_pipe(tmp_path, top_k=2)
        raw_list = [
            {"label": normalize_audio_label(r["label"]), "score": float(r["score"])}
            for r in results
        ]
        top = raw_list[0]

        return {
            "verdict": top["label"],
            "confidence": int(top["score"] * 100),
            "raw": raw_list,
        }
    except Exception as error:
        return {
            "error": str(error),
            "verdict": "ERROR",
            "confidence": 0,
            "raw": [],
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/analyze/image")
async def analyze_image(file: UploadFile = File(...)):
    suffix = os.path.splitext(file.filename or "")[-1] or ".png"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        image = Image.open(tmp_path).convert("RGB")
        ai_result = classify_ai_generated_image(image)
        face_image, face_box = detect_largest_face(image)

        if face_image is None:
            combined_fake = ai_result["fake_probability"]
            combined_real = ai_result["real_probability"]
            return {
                "verdict": ai_result["verdict"],
                "confidence": ai_result["confidence"],
                "fake_probability": combined_fake,
                "real_probability": combined_real,
                "ai_verdict": ai_result["verdict"],
                "ai_fake_probability": ai_result["fake_probability"],
                "ai_real_probability": ai_result["real_probability"],
                "face_verdict": "UNCERTAIN",
                "face_fake_probability": 50,
                "face_real_probability": 50,
                "face_found": False,
                "face_box": None,
                "model": "ConvNeXt AI Image Detector + Yermandy Face Forgery Detector",
                "model_id": f"{AI_IMAGE_MODEL_ID} + {FACE_MODEL_ID}",
                "raw": ai_result["raw"] + [{"label": "NO_FACE_DETECTED", "score": 0}],
            }

        try:
            face_result = classify_face_forgery(face_image)
            face_found_for_result = True
            face_error = None
        except Exception as face_error_value:
            face_result = {
                "verdict": "UNCERTAIN",
                "confidence": 50,
                "fake_probability": 50,
                "real_probability": 50,
                "raw": [{"label": "FACE_FORGERY_ERROR", "score": 0}],
            }
            face_found_for_result = False
            face_error = str(face_error_value)

        combined_fake = max(ai_result["fake_probability"], face_result["fake_probability"])
        combined_real = 100 - combined_fake

        return {
            "verdict": verdict_from_fake_probability(combined_fake),
            "confidence": int(round(max(combined_fake, combined_real))),
            "fake_probability": int(round(combined_fake)),
            "real_probability": int(round(combined_real)),
            "ai_verdict": ai_result["verdict"],
            "ai_fake_probability": ai_result["fake_probability"],
            "ai_real_probability": ai_result["real_probability"],
            "face_verdict": face_result["verdict"],
            "face_fake_probability": face_result["fake_probability"],
            "face_real_probability": face_result["real_probability"],
            "face_found": face_found_for_result,
            "face_box": face_box if face_found_for_result else None,
            "face_error": face_error,
            "model": "ConvNeXt AI Image Detector + Yermandy Face Forgery Detector",
            "model_id": f"{AI_IMAGE_MODEL_ID} + {FACE_MODEL_ID}",
            "raw": ai_result["raw"] + face_result["raw"],
        }
    except Exception as error:
        return {
            "error": str(error),
            "verdict": "ERROR",
            "confidence": 0,
            "fake_probability": 50,
            "real_probability": 50,
            "ai_verdict": "ERROR",
            "ai_fake_probability": 50,
            "ai_real_probability": 50,
            "face_verdict": "ERROR",
            "face_fake_probability": 50,
            "face_real_probability": 50,
            "face_found": False,
            "face_box": None,
            "model": "ConvNeXt AI Image Detector + Yermandy Face Forgery Detector",
            "model_id": f"{AI_IMAGE_MODEL_ID} + {FACE_MODEL_ID}",
            "raw": [],
        }
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


NGROK_TOKEN = os.environ.get("NGROK_TOKEN", "PASTE_YOUR_NGROK_TOKEN_HERE")

if not NGROK_TOKEN or NGROK_TOKEN == "PASTE_YOUR_NGROK_TOKEN_HERE":
    raise RuntimeError("Set NGROK_TOKEN before starting the Colab server.")

os.system("fuser -k 8000/tcp")
ngrok.set_auth_token(NGROK_TOKEN)
ngrok.kill()
tunnel = ngrok.connect(8000)

print("\n" + "=" * 80)
print(f"TRUTHLENS COLAB URL = {tunnel.public_url}")
print("Paste this into .env.local:")
print("COLAB_AUDIO_URL=" + tunnel.public_url)
print("COLAB_IMAGE_URL=" + tunnel.public_url)
print("=" * 80 + "\n")

nest_asyncio.apply()
config = uvicorn.Config(app, host="127.0.0.1", port=8000, loop="asyncio")
server = uvicorn.Server(config)
server.run()
