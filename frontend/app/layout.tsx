import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import NavBar from "@/components/NavBar";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "OSHA Vision Auditor",
  description: "AI-powered worksite safety compliance inspection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          <NavBar />
          <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
