"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  Download,
  FileText,
  Home,
  LayoutGrid,
  Mic,
  Mic2,
  Music,
  Play,
  Settings,
  Sparkles,
  SlidersHorizontal,
  User,
  Volume2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const NAV_SECTIONS = [
  {
    items: [
      { label: "Home", icon: Home, href: "/", active: true },
      { label: "Sessions", icon: LayoutGrid, href: "/session" },
    ],
  },
  {
    label: "PLAYGROUND",
    items: [
      { label: "Voice PRD", icon: Mic, href: "/session", badge: null },
      { label: "AI Strategist", icon: Sparkles, href: "/session", badge: null },
      { label: "Transcript", icon: FileText, href: "/session", badge: null },
      { label: "Voice Changer", icon: SlidersHorizontal, href: "/session", badge: "New" },
    ],
  },
  {
    label: "TOOLS",
    items: [
      { label: "PRD Export", icon: Download, href: "/session", badge: null },
      { label: "Voice Analyze", icon: Volume2, href: "/session", badge: null },
      { label: "Music", icon: Music, href: "/session", badge: null },
      { label: "Quick Session", icon: Zap, href: "/session", badge: "New" },
    ],
  },
];

const FEATURE_CARDS = [
  {
    label: "Voice PRD",
    icon: Mic,
    gradient: "from-orange-400 to-orange-600",
    href: "/session",
  },
  {
    label: "AI Strategist",
    icon: Sparkles,
    gradient: "from-violet-400 to-purple-600",
    href: "/session",
  },
  {
    label: "Transcript",
    icon: FileText,
    gradient: "from-blue-400 to-cyan-600",
    href: "/session",
  },
  {
    label: "Voice Analyze",
    icon: Volume2,
    gradient: "from-amber-400 to-orange-500",
    href: "/session",
  },
  {
    label: "PRD Export",
    icon: Download,
    gradient: "from-emerald-400 to-teal-600",
    href: "/session",
  },
  {
    label: "Quick Session",
    icon: Wand2,
    gradient: "from-rose-400 to-pink-600",
    href: "/session",
  },
];

const LIBRARY_ITEMS = [
  {
    name: "Discovery Sprint",
    desc: "A focused 10-minute session for rapid product ideation and requirement gathering.",
    color: "bg-orange-400",
    label: "FEATURED",
  },
  {
    name: "Deep Dive",
    desc: "Extended session for complex products requiring thorough exploration.",
    color: "bg-violet-400",
    label: "POPULAR",
  },
  {
    name: "Stakeholder Brief",
    desc: "Structured session designed for presenting ideas to decision makers.",
    color: "bg-blue-400",
    label: "TEMPLATE",
  },
  {
    name: "MVP Scoper",
    desc: "Minimal viable product session — cut scope and ship faster.",
    color: "bg-emerald-400",
    label: "QUICK",
  },
  {
    name: "Tech Spec Builder",
    desc: "Engineering-focused session that outputs a technical specification.",
    color: "bg-rose-400",
    label: "ADVANCED",
  },
];

const CTA_CARDS = [
  {
    label: "Start Voice Session",
    desc: "Talk your product idea into an implementation-ready PRD",
    gradient: "from-orange-400 to-orange-600",
    href: "/session",
    icon: Mic2,
  },
  {
    label: "Browse Templates",
    desc: "Start from a curated session template for your use case",
    gradient: "from-violet-400 to-purple-600",
    href: "/session",
    icon: LayoutGrid,
  },
  {
    label: "Quick Export",
    desc: "Export your last session transcript as a formatted PRD",
    gradient: "from-emerald-400 to-teal-600",
    href: "/session",
    icon: Download,
  },
];

export default function HomePage() {
  const [greeting, setGreeting] = useState("Good Morning");
  const [showCredit, setShowCredit] = useState(true);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-white font-mono text-black">

      {/* ══ Sidebar ══ */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-black/8 bg-white">

        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-black/8 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-medium tracking-tight text-black font-mono">VoiceAI</span>
          <button type="button" className="ml-auto text-black/25 hover:text-black/50 transition">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Workspace selector */}
        <div className="border-b border-black/8 px-3 py-3">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-sm hover:bg-black/[0.04] transition"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 text-xs font-medium">
              V
            </div>
            <span className="flex-1 text-left text-sm font-medium text-black font-mono">My Workspace</span>
            <ChevronDown className="h-3.5 w-3.5 text-black/35" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              {section.label && (
                <p className="mb-1.5 px-2 text-[9px] font-medium uppercase tracking-[0.3em] text-black/30 font-mono">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition font-mono",
                      "active" in item && item.active
                        ? "bg-orange-50 text-orange-600"
                        : "text-black/55 hover:bg-black/[0.04] hover:text-black",
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", "active" in item && item.active ? "text-orange-500" : "text-black/40")} />
                    <span className="flex-1 font-medium">{item.label}</span>
                    {"badge" in item && item.badge && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] text-orange-600 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Credit usage widget */}
        {showCredit && (
          <div className="border-t border-black/8 m-3 rounded-2xl border border-black/8 bg-black/[0.02] p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {/* Ring */}
                <div className="relative h-10 w-10 shrink-0">
                  <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#E5E5E5" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15" fill="none"
                      stroke="#F97316" strokeWidth="3"
                      strokeDasharray={`${0.8 * 94.25} 94.25`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-black font-mono">
                    80%
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-black font-mono">Session Credits</p>
                  <p className="text-[11px] text-black/40 font-mono mt-0.5">80% of 100 used</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCredit(false)}
                className="text-black/25 hover:text-black/50 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-black/45 font-mono mb-3">
              Running low on sessions. Upgrade for unlimited access.
            </p>
            <div className="flex items-center gap-3">
              <button type="button" className="text-[11px] text-black/35 font-mono hover:text-black/60 transition">
                Dismiss
              </button>
              <Link
                href="/session"
                className="text-[11px] font-medium text-orange-600 font-mono hover:text-orange-700 transition"
              >
                Upgrade plan
              </Link>
            </div>
          </div>
        )}
      </aside>

      {/* ══ Main content ══ */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-black/8 bg-white px-7 py-3.5">
          <div className="flex items-center gap-2 text-sm text-black/40 font-mono">
            <span>Home</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/session"
              className="flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-sm text-orange-600 font-mono hover:bg-orange-100 transition"
            >
              <Zap className="h-3.5 w-3.5" />
              New Session
            </Link>
            <button type="button" className="rounded-full border border-black/10 p-1.5 text-black/40 hover:text-black/70 transition">
              <Bell className="h-4 w-4" />
            </button>
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded-full bg-black/8 text-black/50 hover:bg-black/12 transition">
              <User className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-7 py-6 space-y-8">

          {/* Greeting */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-black/35 font-mono uppercase tracking-[0.3em] mb-1">My Workspace</p>
              <h1 className="text-3xl font-medium tracking-tight text-black font-mono">
                {greeting}, Builder
              </h1>
            </div>
            <Link
              href="/session"
              className="flex items-center gap-2 rounded-full border border-black bg-black px-5 py-2.5 text-sm text-white font-mono hover:bg-black/85 transition"
            >
              <Mic className="h-4 w-4" />
              Talk to AI
            </Link>
          </div>

          {/* Feature cards */}
          <div>
            <div className="grid grid-cols-6 gap-3">
              {FEATURE_CARDS.map((card) => (
                <Link key={card.label} href={card.href}>
                  <motion.div
                    whileHover={{ y: -3, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                    className="group flex flex-col rounded-2xl border border-black/8 bg-[#F7F7F7] p-4 cursor-pointer overflow-hidden relative"
                  >
                    {/* Icon box */}
                    <div className={cn(
                      "mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                      card.gradient,
                    )}>
                      <card.icon className="h-5 w-5" />
                    </div>
                    {/* Hover glow */}
                    <div className={cn(
                      "absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30",
                      card.gradient,
                    )} />
                    <p className="text-xs font-medium text-black/70 font-mono mt-auto">{card.label}</p>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-black/6" />

          {/* Latest from the library */}
          <div>
            <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-black/40 font-mono">
              Latest from the Library
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {LIBRARY_ITEMS.slice(0, 3).map((item) => (
                <Link key={item.name} href="/session">
                  <motion.div
                    whileHover={{ backgroundColor: "rgba(0,0,0,0.03)" }}
                    className="group flex items-start gap-3 rounded-2xl border border-black/6 bg-white p-4 cursor-pointer transition"
                  >
                    <div className={cn("mt-0.5 h-8 w-8 shrink-0 rounded-lg", item.color, "flex items-center justify-center")}>
                      <Mic className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-black font-mono truncate">{item.name}</p>
                        <span className="shrink-0 rounded-full bg-black/6 px-1.5 py-0.5 text-[9px] font-medium text-black/40 font-mono">
                          {item.label}
                        </span>
                      </div>
                      <p className="text-xs text-black/40 font-mono leading-5 line-clamp-2">{item.desc}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
              {LIBRARY_ITEMS.slice(3).map((item) => (
                <Link key={item.name} href="/session">
                  <motion.div
                    whileHover={{ backgroundColor: "rgba(0,0,0,0.03)" }}
                    className="group flex items-start gap-3 rounded-2xl border border-black/6 bg-white p-4 cursor-pointer transition"
                  >
                    <div className={cn("mt-0.5 h-8 w-8 shrink-0 rounded-lg", item.color, "flex items-center justify-center")}>
                      <Mic className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-black font-mono truncate">{item.name}</p>
                        <span className="shrink-0 rounded-full bg-black/6 px-1.5 py-0.5 text-[9px] font-medium text-black/40 font-mono">
                          {item.label}
                        </span>
                      </div>
                      <p className="text-xs text-black/40 font-mono leading-5 line-clamp-2">{item.desc}</p>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-black/6" />

          {/* Create or start a session */}
          <div>
            <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[0.28em] text-black/40 font-mono">
              Create or Start a Session
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {CTA_CARDS.map((card) => (
                <Link key={card.label} href={card.href}>
                  <motion.div
                    whileHover={{ y: -2, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    className="group flex items-center gap-4 rounded-2xl border border-black/8 bg-white p-4 cursor-pointer overflow-hidden relative"
                  >
                    <div className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
                      card.gradient,
                    )}>
                      <card.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black font-mono">{card.label}</p>
                      <p className="mt-0.5 text-xs text-black/40 font-mono leading-5">{card.desc}</p>
                    </div>
                    {/* Glow */}
                    <div className={cn(
                      "absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-20",
                      card.gradient,
                    )} />
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>

          {/* Bottom padding */}
          <div className="h-4" />
        </main>
      </div>
    </div>
  );
}
