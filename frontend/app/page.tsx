"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ─── Story tabs ──────────────────────────────────────────────── */
const STORY_TABS = [
  {
    id: "problem",
    label: "The Problem",
    content: {
      heading: "Between inspections, anything can happen.",
      body: `OSHA mandates hard hats and high-visibility vests on every active construction site.

In practice, compliance is checked by a safety officer doing a walkthrough — maybe once a day, sometimes less. Between those checks, workers cut corners. Equipment gets removed. Incidents happen.

1,069 construction workers died in the United States last year. Most were in industries where PPE violations are routine. The gap between "required" and "enforced" is where people get hurt.`,
    },
  },
  {
    id: "idea",
    label: "Our Idea",
    content: {
      heading: "We had 72 hours. That was enough to ask the question.",
      body: `We were at a hackathon. One of us had just finished reading an OSHA fatality report about a worker struck by falling material — no hard hat.

We kept coming back to the same question: cameras are already on these sites. AI can process video in seconds. Why is anyone still relying on a clipboard and a walk-around?

So we started building. Not a chatbot, not a dashboard with fake metrics — an actual pipeline that watches footage and flags what it finds.`,
    },
  },
  {
    id: "built",
    label: "What We Built",
    content: {
      heading: "Upload a video. Get a report. That's the whole product.",
      body: `An end-to-end pipeline: upload any worksite video, we sample a frame every 5 seconds and send each through Claude AI Vision, which inspects the full scene against all OSHA 29 CFR 1926 construction safety categories — PPE, fall protection, ladders, scaffolding, electrical, excavation, fire safety, and more.

Every violation gets a timestamp. Risk gets scored 0–100. Claude then turns the raw data into a structured OSHA-aligned report with actionable recommendations.

It doesn't replace a safety officer. It covers every second between their rounds.`,
    },
  },
  {
    id: "next",
    label: "What's Next",
    content: {
      heading: "We built the foundation. The roadmap writes itself.",
      body: `Live camera feeds with real-time alerts — not post-incident reports. Hard hat color tracking by individual worker. Fall detection. Scaffold proximity warnings. OSHA regulation cross-referencing by job site type.

Site-wide risk maps that update over the course of a project, not just after a video gets uploaded.

We built this in 72 hours. We know what version 2 looks like. We just need the time to build it — and people who care enough to use version 1.`,
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
    desc: "Drop in any construction video — MP4, MOV, AVI, WebM. Up to 100 MB. No special format needed.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="2" y="3" width="18" height="16" rx="3" stroke="#dc2626" strokeWidth="1.4"/>
        <path d="M11 7V14M11 7L8 10M11 7L14 10" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    n: "02",
    title: "AI scans every second",
    desc: "Claude AI Vision inspects each frame against all OSHA 29 CFR 1926 categories — PPE, fall protection, scaffolding, electrical, and more.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8.5" stroke="#dc2626" strokeWidth="1.4"/>
        <path d="M8 11L10 13L14 9" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11 2V4M11 18V20M2 11H4M18 11H20" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"/>
      </svg>
    ),
  },
  {
    n: "03",
    title: "Get your report",
    desc: "A 0–100 risk score, a timestamped violation log you can click to jump to in the video, and an OSHA-aligned summary.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="2" width="16" height="18" rx="2.5" stroke="#dc2626" strokeWidth="1.4"/>
        <path d="M7 8H15M7 11H15M7 14H11" stroke="#dc2626" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
];

/* ─── What it catches ─────────────────────────────────────────── */
const CATCHES = [
  {
    title: "PPE violations",
    desc: "Hard hats, safety vests, eye protection, gloves, and proper footwear — flagged by Claude AI against all OSHA 29 CFR 1926 PPE standards.",
    badge: "badge-helmet",
    badgeText: "High",
  },
  {
    title: "Fall & height hazards",
    desc: "Unprotected edges, missing harnesses, unsafe ladder angles, scaffold guardrail violations — the leading cause of construction fatalities.",
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
      <div className="text-gray-600 text-xs">{sublabel}</div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────── */
export default function LandingPage() {
  const [activeTab, setActiveTab] = useState(0);
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
             style={{ background: "radial-gradient(ellipse, rgba(220,38,38,0.07) 0%, transparent 70%)" }} />

        <div className="relative max-w-3xl mx-auto animate-fade-in-up space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border"
               style={{ borderColor: "rgba(220,38,38,0.28)", background: "rgba(220,38,38,0.06)" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#dc2626" }} />
            <span className="text-xs font-semibold tracking-wide" style={{ color: "#f87171" }}>
              Open source · Built in 72h · Claude AI Vision
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.08]"
              style={{ color: "#f1f1f1" }}>
            Construction sites kill<br />
            more workers than<br />
            <span style={{ color: "#dc2626" }}>you probably think.</span>
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mx-auto">
            Not a scare tactic — just the OSHA data from last year.
            We built an AI that watches for PPE violations so you
            don't have to do it with a clipboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/auth?tab=signup" className="btn-primary px-7 py-3 text-sm">
              Run your first audit — free
            </Link>
            <a href="#story"
               className="btn-ghost text-sm flex items-center gap-1.5 px-4 py-3">
              Read our story
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 3V11M7 11L4 8M7 11L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
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
               style={{ borderTop: "1px solid #251212", borderBottom: "1px solid #251212", background: "#0b0b0b" }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          {STATS.map((s) => (
            <StatItem key={s.label} {...s} active={statsVisible} />
          ))}
        </div>
      </section>

      {/* ── STORY ──────────────────────────────────────────────── */}
      <section id="story" className="py-24 px-5 sm:px-8">
        <div className="max-w-4xl mx-auto">
          <p className="section-label mb-3">Why we built this</p>
          <h2 className="text-3xl font-bold text-white mb-10" style={{ maxWidth: "480px" }}>
            A hackathon question that turned into a real thing.
          </h2>

          {/* Tabs */}
          <div className="flex gap-1 flex-wrap mb-8">
            {STORY_TABS.map((t, i) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(i)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150"
                style={activeTab === i
                  ? { background: "#1a0a0a", color: "#ffffff", border: "1px solid #3a1818" }
                  : { background: "transparent", color: "#4b5563", border: "1px solid transparent" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div key={activeTab}
               className="animate-scale-in rounded-2xl p-7"
               style={{ background: "#0e0e0e", border: "1px solid #251212" }}>
            <h3 className="text-white font-semibold text-lg mb-4 leading-snug">
              {STORY_TABS[activeTab].content.heading}
            </h3>
            <div className="space-y-4">
              {STORY_TABS[activeTab].content.body.split("\n\n").map((para, i) => (
                <p key={i} className="text-gray-400 text-sm leading-relaxed">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────── */}
      <section className="py-20 px-5 sm:px-8"
               style={{ background: "#0b0b0b", borderTop: "1px solid #251212" }}>
        <div className="max-w-5xl mx-auto">
          <p className="section-label mb-3">How it works</p>
          <h2 className="text-3xl font-bold text-white mb-12" style={{ maxWidth: "400px" }}>
            Three steps. No setup. No training data.
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div key={step.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-6 h-px z-10"
                       style={{ background: "linear-gradient(to right, #3a1818, transparent)" }} />
                )}
                <div className="card-hover p-5 rounded-2xl h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                         style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.16)" }}>
                      {step.icon}
                    </div>
                    <span className="text-5xl font-bold tabular-nums mt-1"
                          style={{ color: "#251212", lineHeight: 1 }}>
                      {step.n}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT IT CATCHES ────────────────────────────────────── */}
      <section className="py-20 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <p className="section-label mb-3">What it detects</p>
          <h2 className="text-3xl font-bold text-white mb-12" style={{ maxWidth: "420px" }}>
            14+ violation types. One risk score. One report.
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {CATCHES.map((c) => (
              <div key={c.title}
                   className="card-hover p-5 rounded-2xl flex gap-4">
                <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
                     style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.13)" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="#dc2626" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M5.5 8L7 9.5L10.5 6" stroke="#dc2626" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-white text-sm font-semibold">{c.title}</h3>
                    {c.badge && (
                      <span className={c.badge}>{c.badgeText}</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────── */}
      <section className="py-28 px-5 sm:px-8 text-center relative overflow-hidden"
               style={{ background: "#0b0b0b", borderTop: "1px solid #251212" }}>
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "radial-gradient(ellipse at center, rgba(220,38,38,0.06) 0%, transparent 60%)" }} />
        <div className="relative max-w-xl mx-auto space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            If you manage a worksite,<br />run your first audit.
          </h2>
          <p className="text-gray-500 text-base">
            Free account. No credit card. No setup time.
            Upload a video and get a report in minutes.
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
