"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import TextType from "@/components/TextType";
import BlurText from "@/components/BlurText";

/* ─── Story tabs ──────────────────────────────────────────────── */
const STORY_TABS = [
  {
    id: "problem",
    label: "The Problem",
    content: {
      heading: "Safety inspections can't cover every shift.",
      body: `OSHA requires PPE compliance across all active construction and industrial sites. In practice, safety officers conduct walkthroughs once per shift at best. Between those checks, violations occur: equipment comes off, hazards go unaddressed, and incidents happen.

1,069 construction workers died in the US last year. Most worked in industries where PPE compliance is inconsistently enforced. The gap between what's required and what's actually monitored is where incidents happen.

For large operations with multiple crews and active sites, manual inspection doesn't scale.`,
    },
  },
  {
    id: "idea",
    label: "Our Approach",
    content: {
      heading: "Site cameras already exist. We built the detection layer.",
      body: `Most industrial and construction sites already have video surveillance. The footage exists, but it isn't being analyzed for safety compliance.

We built a pipeline that uses AI vision to analyze that footage and flag violations: missing PPE, fall hazards, electrical issues, and more, frame by frame, against the full OSHA 29 CFR 1926 standard.

No additional hardware. No manual review. Every violation is timestamped and documented automatically.`,
    },
  },
  {
    id: "built",
    label: "What We Built",
    content: {
      heading: "Upload a video. Get a compliance report.",
      body: `An end-to-end pipeline: upload any worksite video, and the system samples a frame every two seconds, running each through Claude AI Vision. It checks the full scene against OSHA 29 CFR 1926 construction safety categories including PPE, fall protection, ladders, scaffolding, electrical, excavation, fire safety, and more.

Every violation gets a timestamp. Risk is scored 0–100. The system generates a structured OSHA-aligned report with corrective recommendations.

It doesn't replace your safety team. It covers every minute between their rounds.`,
    },
  },
  {
    id: "next",
    label: "What's Next",
    content: {
      heading: "This is the foundation. The roadmap is straightforward.",
      body: `Live camera integration with real-time alerts, not just post-shift review. Per-worker hard hat tracking by color. Fall detection. Scaffold proximity monitoring. OSHA regulation lookup by site type and jurisdiction.

Site-wide risk dashboards that update continuously over the course of a project, not just when a video gets uploaded.

The current system handles post-shift compliance review. The next version handles real-time monitoring at scale.`,
    },
  },
];

/* ─── Stats ───────────────────────────────────────────────────── */
const STATS = [
  { value: 1069, suffix: "", label: "US construction fatalities", sublabel: "Bureau of Labor Statistics, 2023" },
  { value: 60, suffix: "%", label: "were preventable with PPE", sublabel: "OSHA incident data" },
  { value: 14, suffix: "+", label: "OSHA violation types detected", sublabel: "Claude AI Vision" },
  { value: 170, suffix: "B", label: "annual US injury cost", sublabel: "National Safety Council" },
];

/* ─── How it works ────────────────────────────────────────────── */
const STEPS = [
  {
    n: "01",
    title: "Upload your footage",
    desc: "Drop in any construction video. MP4, MOV, AVI, or WebM. Up to 100 MB.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="3" width="18" height="16" rx="3" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4"/>
        <path d="M11 7V14M11 7L8 10M11 7L14 10" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    n: "02",
    title: "AI scans every frame",
    desc: "Claude AI Vision inspects each frame against OSHA 29 CFR 1926 standards: PPE, fall protection, scaffolding, electrical, excavation, and more.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4"/>
        <path d="M8 11L10 13L14 9" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11 2V4M11 18V20M2 11H4M18 11H20" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
      </svg>
    ),
  },
  {
    n: "03",
    title: "Get your report",
    desc: "A risk score from 0 to 100. A clickable timestamped violation log. An OSHA-aligned summary with corrective actions.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="2" width="16" height="18" rx="2.5" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4"/>
        <path d="M7 8H15M7 11H15M7 14H11" stroke="rgba(255,255,255,0.75)" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

/* ─── What it catches ─────────────────────────────────────────── */
const CATCHES = [
  {
    title: "PPE violations",
    desc: "Hard hats, safety vests, eye protection, gloves, and footwear. Flagged against OSHA 29 CFR 1926 PPE standards.",
    badge: "badge-helmet",
    badgeText: "High",
  },
  {
    title: "Fall & height hazards",
    desc: "Unprotected edges, missing harnesses, unsafe ladder angles, and scaffold guardrail violations. The leading cause of construction fatalities.",
    badge: "badge-vest",
    badgeText: "Critical",
  },
  {
    title: "Weighted risk score",
    desc: "14+ violation types weighted by severity. Fall hazards score highest. Normalized per video length for fair comparison across sites.",
    badge: null,
    badgeText: "Score",
  },
  {
    title: "OSHA safety report",
    desc: "Claude AI turns raw violation data into a structured OSHA-aligned brief with corrective actions and regulation citations.",
    badge: null,
    badgeText: "Report",
  },
];

/* ─── useCountUp ──────────────────────────────────────────────── */
function useCountUp(target: number, active: boolean, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setCount(start);
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
}

function StatItem({ value, suffix, label, sublabel, active }: typeof STATS[0] & { active: boolean }) {
  const count = useCountUp(value, active);
  return (
    <div className="text-center space-y-1.5">
      <div className="text-4xl font-bold text-white tabular-nums" style={{ letterSpacing: "-0.02em" }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-gray-300 text-sm font-medium">{label}</div>
      <div className="text-gray-500 text-xs">{sublabel}</div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function LandingPage() {
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="-mt-10 -mx-5 sm:-mx-8">

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col justify-center items-center
                          text-center px-5 sm:px-8 grid-bg overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px]
                        pointer-events-none rounded-full"
             style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />

        <div className="relative max-w-3xl mx-auto animate-fade-in-up space-y-6">

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.12]"
              style={{ color: "#f1f1f1" }}>
            Automated OSHA compliance<br />
            <span style={{ color: "var(--accent)" }}>for industrial worksites.</span>
          </h1>

          <p className="text-gray-200 text-base leading-relaxed max-w-lg mx-auto">
            Upload any worksite video. The system identifies safety violations,
            timestamps each one, and generates a compliance report in minutes.
          </p>

          <div className="flex items-center justify-center pt-2">
            <Link href="/auth?tab=signup" className="btn-primary px-7 py-3 text-sm font-bold">
              Run your first audit
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="w-px h-8" style={{
            background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.3))"
          }} />
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────── */}
      <section ref={statsRef}
               className="py-16 px-5 sm:px-8"
               style={{ borderTop: "1px solid rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0b0b0b" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          {STATS.map((s) => (
            <StatItem key={s.label} {...s} active={statsVisible} />
          ))}
        </div>
      </section>

      {/* ── STORY ──────────────────────────────────────────────── */}
      <section id="story" className="py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <p className="section-label mb-3 text-center">The problem we solve</p>
          <h2 className="text-3xl font-bold text-white mb-10 text-center" style={{ minHeight: "2.5rem" }}>
            <TextType
              text="Built for safety teams managing large industrial operations."
              typingSpeed={45}
              loop={false}
              showCursor={false}
              startOnVisible={true}
            />
          </h2>

          {/* Content */}
          <div className="rounded-2xl p-7"
               style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-gray-200 text-sm leading-relaxed" style={{ whiteSpace: "pre-wrap" }}>
              <TextType
                text={STORY_TABS[0].content.body}
                typingSpeed={6}
                loop={false}
                showCursor={true}
                startOnVisible={true}
              />
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section className="py-20 px-5 sm:px-8"
               style={{ background: "#0b0b0b", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="max-w-5xl mx-auto">
          <p className="section-label mb-3 text-center">
            <BlurText text="How it works" delay={0.06} />
          </p>
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            <BlurText text="Three steps. No setup." delay={0.07} />
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-6 h-px z-10"
                       style={{ background: "linear-gradient(to right, rgba(255,255,255,0.08), transparent)" }} />
                )}
                <div className="card-hover p-5 rounded-2xl h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}>
                      {step.icon}
                    </div>
                    <span className="text-5xl font-bold tabular-nums mt-1"
                          style={{ color: "rgba(255,255,255,0.13)", lineHeight: 1 }}>
                      {step.n}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2">
                    <BlurText text={step.title} delay={0.07} stepDuration={0.3} />
                  </h3>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    <BlurText text={step.desc} delay={0.03} stepDuration={0.3} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT IT CATCHES ────────────────────────────────────── */}
      <section className="py-20 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="section-label mb-3 text-center">
            <BlurText text="What it detects" delay={0.06} />
          </p>
          <h2 className="text-3xl font-bold text-white mb-12 text-center">
            <BlurText text="14+ violation types. One risk score. One report." delay={0.07} />
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {CATCHES.map((c) => (
              <div key={c.title}
                   className="card-hover p-5 rounded-2xl flex gap-4">
                <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
                     style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M5.5 8L7 9.5L10.5 6" stroke="rgba(255,255,255,0.75)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-white text-sm font-semibold">
                      <BlurText text={c.title} delay={0.07} stepDuration={0.3} />
                    </h3>
                    {c.badge && (
                      <span className={c.badge}>{c.badgeText}</span>
                    )}
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    <BlurText text={c.desc} delay={0.03} stepDuration={0.3} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="py-28 px-5 sm:px-8 text-center relative overflow-hidden"
               style={{ background: "#0b0b0b", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 60%)" }} />
        <div className="relative max-w-xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            <BlurText text="Ready to put it to work on your sites?" delay={0.06} />
          </h2>
          <p className="text-gray-300 text-base">
            <BlurText text="Upload a worksite video and get a full OSHA compliance report in minutes." delay={0.04} stepDuration={0.3} />
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth?tab=signup" className="btn-primary px-8 py-3 text-sm">
              Create your account
            </Link>
            <Link href="/auth?tab=signin" className="btn-ghost text-sm px-4 py-3">
              Sign in to existing account
            </Link>
          </div>
          <p className="text-gray-700 text-xs">
            Open source ·{" "}
            <a href="https://github.com/AhmedMohammed4/osha-vision-auditor"
               target="_blank" rel="noopener noreferrer"
               className="underline hover:text-gray-500 transition-colors">
              View on GitHub
            </a>
          </p>
        </div>
      </section>

    </div>
  );
}
