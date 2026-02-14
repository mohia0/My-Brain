import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import React from 'react';
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brainia - Second Brain",
  description: "Organize your thoughts, ideas, and projects on an infinite spatial canvas. Brainia is the ultimate productivity workspace for visual thinkers, mimicking how your mind actually works.",
  keywords: ["productivity", "spatial workspace", "second brain", "mind mapping", "visual notes", "knowledge management", "infinite canvas"],
  authors: [{ name: "Mohi Hassan" }],
  icons: {
    icon: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
        <Toaster position="top-center" theme="dark" closeButton />
      </body>
    </html>
  );
}
