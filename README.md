# 🔍 TruthLens: Forensic Media Verification Platform

> **Know whether a voice, image, or video was manipulated before you act.**

TruthLens is a high-performance, forensic-grade media verification platform built to combat the rising threat of deepfakes and AI-generated media. Designed for real verification work, it combines signal analysis, context checks, and evidence-backed reporting in a single, intuitive workflow.

---

## 🚨 The Problem
With generative AI becoming mainstream, hyper-realistic voice cloning, face-swapping, and synthetic media are being weaponized for fraud, extortion, and misinformation. Existing detection tools are often black boxes, providing a generic "confidence score" without actionable evidence or clear next steps.

## 💡 The Solution
**TruthLens** brings forensic analysis to everyone. It doesn't just give you a percentage; it provides a structured, multi-model analysis stack that delivers a clear verdict, supports it with observable artifacts, and issues a shareable certificate of authenticity.

Whether you're a journalist verifying a source, a security professional handling fraud response, or simply double-checking a suspicious voice note, TruthLens provides clarity when trust is compromised.

---

## ✨ Key Features

- **🎙️ Audio Forensics**: Analyzes voice cloning, cadence drift, synthetic timbre, and acoustic artifacts.
- **🖼️ Image Verification**: Reviews face textures, lighting inconsistencies, and manipulation artifacts.
- **🎥 Video Analysis**: Checks frame continuity and detects audio-visual mismatches (e.g., lip-sync drift).
- **🧠 Context Cross-Checking**: Compares emotional tone and claimed scenarios with the actual media content to flag contradictions.
- **📄 Shareable Certificates**: Generates a downloadable, forensic-style certificate summarizing the verdict, risk level, and supporting evidence.
- **🔒 Privacy First**: All history is stored locally in your browser. We don't train models on your sensitive data.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Frontend**: React, TypeScript, standard CSS with a custom "Forensic Dark" UI/UX.
- **Icons**: [Lucide React](https://lucide.dev/)
- **Analysis Engine**: Simulated 12-model forensic pipeline (Hackathon implementation ready for real API integration).
- **Storage**: Browser LocalStorage/SessionStorage for privacy-preserving history.

---

## 🚀 Getting Started

Follow these steps to run TruthLens locally:

### 1. Clone the repository
```bash
git clone https://github.com/your-username/truthlens.git
cd truthlens
```

### 2. Install dependencies
```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Run the development server
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 📂 Project Structure

```text
src/
├── app/                  # Next.js App Router pages
│   ├── api/analyze/      # Analysis engine endpoint
│   ├── certificate/      # Shareable certificate view
│   ├── history/          # Local analysis log
│   ├── results/          # Detailed forensic workspace
│   ├── upload/           # Media intake interface
│   └── globals.css       # Core design system & CSS variables
├── components/           # Reusable React components
│   └── tabs/             # Result view sub-panels (Audio, Image, Context, Report)
└── lib/                  # Utilities and types
    ├── storage.ts        # Local storage management
    └── types.ts          # Shared TypeScript interfaces
```
## 🤝 Team
*This project was built for [Insert Hackathon Name].*

- **Team Name : Dead Code** - Role (e.g., Full Stack Developer, UX Designer)
- **Leader : Muhammad Junaid** - Role

---

<div align="center">
  <i>Built with focus and precision. Trust, but verify.</i>
</div>
