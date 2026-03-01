"use client";
import dynamic from "next/dynamic";
import type { BeamsProps } from "./Beams";

// Beams uses Three.js WebGL — must never run during SSR
const BeamsDynamic = dynamic<BeamsProps>(() => import("./Beams"), { ssr: false });

export default function BeamsWrapper(props: BeamsProps) {
  return <BeamsDynamic {...props} />;
}
