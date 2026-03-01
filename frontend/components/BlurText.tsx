"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { TargetAndTransition } from "motion/react";

interface BlurTextProps {
  text: string;
  /** Delay in seconds between each word/letter animating in */
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  threshold?: number;
  rootMargin?: string;
  animationFrom?: Record<string, unknown>;
  animationTo?: Record<string, unknown>;
  easing?: [number, number, number, number];
  onAnimationComplete?: () => void;
  /** Duration in seconds for each element's fade/blur animation */
  stepDuration?: number;
}

export default function BlurText({
  text,
  delay = 0.05,
  className = "",
  style,
  animateBy = "words",
  direction = "top",
  threshold = 0.1,
  rootMargin = "0px",
  animationFrom,
  animationTo,
  easing = [0.25, 0.4, 0.55, 1] as [number, number, number, number],
  onAnimationComplete,
  stepDuration = 0.35,
}: BlurTextProps) {
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const elements = animateBy === "words" ? text.split(" ") : text.split("");

  const defaultFrom: Record<string, unknown> = {
    filter: "blur(10px)",
    opacity: 0,
    y: direction === "top" ? -10 : 10,
  };

  const defaultTo: Record<string, unknown> = {
    filter: "blur(0px)",
    opacity: 1,
    y: 0,
  };

  const from = animationFrom ?? defaultFrom;
  const to = animationTo ?? defaultTo;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <span ref={containerRef} className={className} style={style}>
      {elements.map((el, i) => (
        <motion.span
          key={i}
          initial={from as TargetAndTransition}
          animate={(isInView ? to : from) as TargetAndTransition}
          transition={{
            duration: stepDuration,
            delay: i * delay,
            ease: easing,
          }}
          onAnimationComplete={
            i === elements.length - 1 ? onAnimationComplete : undefined
          }
          style={{
            display: "inline-block",
            willChange: "transform, opacity, filter",
            marginRight: animateBy === "words" ? "0.3em" : "0",
          }}
        >
          {el}
        </motion.span>
      ))}
    </span>
  );
}
