import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import NavBar from "@/components/NavBar";
import BeamsWrapper from "@/components/BeamsWrapper";
import BeamsErrorBoundary from "@/components/BeamsErrorBoundary";
import PageTransition from "@/components/PageTransition";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });

export const metadata: Metadata = {
  title: "OSHA Vision Auditor",
  description: "AI-powered worksite safety compliance inspection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>

        {/*
          Global Beams — fixed overlay at z-index 10, below the navbar (z-50).
          mix-blend-mode: screen means the beams ADD brightness to every pixel
          beneath them regardless of the section background colour — so they're
          visible throughout the entire site without covering any UI.
        */}
        <BeamsErrorBoundary>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10,
              pointerEvents: "none",
              mixBlendMode: "screen",
            }}
          >
            <BeamsWrapper
              beamWidth={3}
              beamHeight={30}
              beamNumber={20}
              lightColor="#ffffff"
              speed={2}
              noiseIntensity={1.75}
              scale={0.2}
              rotation={30}
            />
          </div>
        </BeamsErrorBoundary>

        <Providers>
          <NavBar />
          <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </Providers>

      </body>
    </html>
  );
}
