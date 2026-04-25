import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TruthLens - AI Deepfake Detection",
  description:
    "Upload any suspicious voice message, image, or video and get a clear authenticity verdict with supporting evidence and a shareable certificate.",
  keywords:
    "deepfake detection, voice cloning, AI detection, fraud protection, audio deepfake",
  openGraph: {
    title: "TruthLens",
    description: "Verify suspicious media before you act.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="app-shell" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
