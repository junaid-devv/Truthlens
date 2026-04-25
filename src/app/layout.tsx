import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-next-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-next-display",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-next-mono",
  display: "swap",
});

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
    <html
      lang="en"
      className={`${geistSans.variable} ${spaceGrotesk.variable} ${geistMono.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="app-shell" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
