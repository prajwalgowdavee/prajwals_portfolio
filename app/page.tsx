"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type SpringOptions,
  type MotionValue,
} from "motion/react";
import ProfileCard from "./components/ProfileCard";
import MetallicName from "./components/MetallicName";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import BookEntry from "./components/BookEntry";

// ─── SCROLL CONFIG ────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = [
  { "id": "hero",       "scrolls": 230, "peakAt": 0.55, "origin": "center", "align": "center", "peakScale": 1.35 },
  { "id": "about",      "scrolls": 200, "peakAt": 0.55, "origin": "bottom", "align": "center", "peakScale": 1    },
  { "id": "skills",     "scrolls": 180, "peakAt": 0.45, "origin": "center", "align": "center", "peakScale": 0.9  },
  { "id": "projects",   "scrolls": 150, "peakAt": 0.35, "origin": "center", "align": "center", "peakScale": 0.9  },
  { "id": "experience", "scrolls": 250, "peakAt": 0.40, "origin": "center", "align": "center", "peakScale": 1    },
  { "id": "resume",     "scrolls": 300, "peakAt": 0.59, "origin": "right",  "align": "right",  "peakScale": 0.85 },
  { "id": "contact",    "scrolls": 200, "peakAt": 0.50, "origin": "top",    "align": "top",    "peakScale": 0.75 },
  { "id": "memegame",   "scrolls": 200, "peakAt": 0.40, "origin": "center", "align": "center", "peakScale": 1    },
];

const ENABLE_DEV_TOOLS = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === "true";

type Origin = "center" | "top" | "bottom" | "left" | "right" | "radial";
type Align  = "center" | "top" | "bottom" | "left" | "right";

type SectionCfg = {
  id: string; scrolls: number; peakAt: number;
  origin: string; align: string; peakScale: number;
};

const ORIGINS: Origin[] = ["center","top","bottom","left","right","radial"];
const ALIGNS:  Align[]  = ["center","top","bottom","left","right"];

const navLabels: Record<string,string> = {
  hero: "Hero", about: "About Me", skills: "Skills", projects: "Projects",
  experience: "Experience", resume: "Resume", contact: "Contact", memegame: "Meme Cats",
};

// ─── PARALLAX VIDEO CONFIG ────────────────────────────────────────────────────
const VIDEO_SCRUB_SECTIONS: Array<{
  scrollStart: number;
  scrollEnd: number;
  timeStart: number;
  timeEnd: number;
}> = [
  { scrollStart: 0, scrollEnd: 1650, timeStart: 0.0, timeEnd: 33.0 },
];

const VIDEO_LOOP_START   = 33;
const VIDEO_LOOP_END     = 50;
const TOTAL_SCROLL_UNITS = DEFAULT_CONFIG.reduce((a, c) => a + c.scrolls, 0);

// ─── FRAME EXTRACTION SETTINGS ───────────────────────────────────────────────
const SCRUB_FPS         = 12;
const LOOP_FPS          = 24;
const FRAME_WIDTH       = 960;
const FRAME_HEIGHT      = 540;

const SCRUB_END_TIME    = VIDEO_SCRUB_SECTIONS[VIDEO_SCRUB_SECTIONS.length - 1].timeEnd;
const SCRUB_FRAME_COUNT = Math.ceil(SCRUB_END_TIME * SCRUB_FPS);
const LOOP_FRAME_COUNT  = Math.ceil((VIDEO_LOOP_END - VIDEO_LOOP_START) * LOOP_FPS);

// IndexedDB cache key — bump version to invalidate
const IDB_CACHE_KEY     = "parallax_frames_v3";
const IDB_CACHE_TTL     = 60 * 60 * 1000; // 1 hour

// ─── LUT for scroll → video time (O(1), built once) ─────────────────────────
const VIDEO_LUT_SIZE = 4096;
const VIDEO_LUT: Float32Array = (() => {
  const lut = new Float32Array(VIDEO_LUT_SIZE + 1);
  for (let i = 0; i <= VIDEO_LUT_SIZE; i++) {
    const su = (i / VIDEO_LUT_SIZE) * TOTAL_SCROLL_UNITS;
    let time = VIDEO_LOOP_START;
    for (const seg of VIDEO_SCRUB_SECTIONS) {
      if (su <= seg.scrollEnd) {
        const t = (su - seg.scrollStart) / (seg.scrollEnd - seg.scrollStart);
        time = seg.timeStart + t * (seg.timeEnd - seg.timeStart);
        break;
      }
    }
    lut[i] = time;
  }
  return lut;
})();

function scrollUnitsToVideoTime(scrollUnits: number): number {
  const su  = Math.max(0, Math.min(TOTAL_SCROLL_UNITS, scrollUnits));
  const idx = (su / TOTAL_SCROLL_UNITS) * VIDEO_LUT_SIZE;
  const i0  = Math.floor(idx);
  const i1  = Math.min(i0 + 1, VIDEO_LUT_SIZE);
  return VIDEO_LUT[i0] + (idx - i0) * (VIDEO_LUT[i1] - VIDEO_LUT[i0]);
}

// ─── IDB HELPERS ─────────────────────────────────────────────────────────────
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("ParallaxFrameCache", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("frames");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbGet(db: IDBDatabase, key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction("frames", "readonly");
    const req = tx.objectStore("frames").get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function idbSet(db: IDBDatabase, key: string, value: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx  = db.transaction("frames", "readwrite");
    const req = tx.objectStore("frames").put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ─── BLOB → BITMAP HELPER ─────────────────────────────────────────────────────
async function blobsToBitmaps(blobs: Blob[]): Promise<ImageBitmap[]> {
  return Promise.all(blobs.map(b => createImageBitmap(b)));
}

// ─── LOADING SCREEN ───────────────────────────────────────────────────────────
interface LoadingScreenProps {
  progress: number;
  phase: "extracting" | "caching" | "ready";
}

function LoadingScreen({ progress, phase }: LoadingScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (phase === "ready") {
      const t = setTimeout(() => setVisible(false), 600);
      return () => clearTimeout(t);
    }
  }, [phase]);

  if (!visible) return null;

  const pct = Math.round(progress * 100);

  const label =
    phase === "extracting" ? `Loading assets… ${pct}%` :
    phase === "caching"    ? "Saving to cache…" :
    "Ready";

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         "var(--z-loading)" as any,
        background:     "var(--loading-bg)",
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "var(--loading-gap)",
        opacity:        phase === "ready" ? 0 : 1,
        transition:     "var(--loading-fade-transition)",
        pointerEvents:  phase === "ready" ? "none" : "auto",
      }}
    >
      <p style={{
        fontFamily:    "'Space Grotesk', sans-serif",
        fontSize:      "var(--loading-name-size)",
        color:         "var(--loading-name-color)",
        letterSpacing: "var(--loading-name-tracking)",
        textTransform: "uppercase",
        margin:        0,
      }}>
        Prajwal Gowda D S
      </p>

      <div style={{
        width:        "var(--loading-bar-width)",
        height:       "var(--loading-bar-height)",
        background:   "var(--loading-bar-track-color)",
        borderRadius: "var(--loading-bar-radius)",
        overflow:     "hidden",
        boxShadow:    "0 0 10px rgba(0,0,0,0.5)",
      }}>
        <div
          className="crystal-load-bar"
          style={{
            height:       "100%",
            width:        `${pct}%`,
            borderRadius: "var(--loading-bar-radius)",
            transition:   "var(--loading-bar-transition)",
          }}
        />
      </div>

      <p style={{
        fontFamily:    "'Space Grotesk', sans-serif",
        fontSize:      "var(--loading-label-size)",
        color:         "var(--loading-label-color)",
        margin:        0,
        letterSpacing: "var(--loading-label-tracking)",
      }}>
        {label}
      </p>
    </div>
  );
}

// ─── PARALLAX VIDEO (canvas-based, zero seek latency) ────────────────────────
interface ParallaxVideoProps {
  scrubFrames:    ImageBitmap[];
  loopFrames:     ImageBitmap[];
  scrollUnitsRef: React.MutableRefObject<number>;
  inLoopZoneRef:  React.MutableRefObject<boolean>;
}

function ParallaxVideo({
  scrubFrames,
  loopFrames,
  scrollUnitsRef,
  inLoopZoneRef,
}: ParallaxVideoProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const rafRef       = useRef<number>(0);
  const lastFrameRef = useRef(-1);
  const loopIdxRef   = useRef(0);
  const lastLoopMs   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || scrubFrames.length === 0) return;

    canvas.width  = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    const ctx     = canvas.getContext("2d")!;

    ctx.drawImage(scrubFrames[0], 0, 0);

    const MS_PER_LOOP_FRAME = 1000 / LOOP_FPS;

    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);

      if (inLoopZoneRef.current && loopFrames.length > 0) {
        if (now - lastLoopMs.current >= MS_PER_LOOP_FRAME) {
          lastLoopMs.current = now;
          loopIdxRef.current = (loopIdxRef.current + 1) % loopFrames.length;
          ctx.drawImage(loopFrames[loopIdxRef.current], 0, 0);
        }
      } else {
        const videoTime  = scrollUnitsToVideoTime(scrollUnitsRef.current);
        const frameIndex = Math.round(videoTime * SCRUB_FPS);
        const clamped    = Math.max(0, Math.min(scrubFrames.length - 1, frameIndex));

        if (clamped !== lastFrameRef.current) {
          lastFrameRef.current = clamped;
          ctx.drawImage(scrubFrames[clamped], 0, 0);
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [scrubFrames, loopFrames, scrollUnitsRef, inLoopZoneRef]);

  return (
    <div style={{
      position:      "fixed",
      inset:         0,
      zIndex:        "var(--z-video)" as any,
      overflow:      "hidden",
      pointerEvents: "none",
    }}>
      <canvas
        ref={canvasRef}
        style={{
          position:       "absolute",
          inset:          0,
          width:          "100%",
          height:         "100%",
          objectFit:      "cover",
          objectPosition: "center",
        }}
      />
      <div style={{
        position:      "absolute",
        inset:         0,
        background:    "var(--video-overlay-color)",
        pointerEvents: "none",
      }} />
    </div>
  );
}

// ─── SCROLL MATH ──────────────────────────────────────────────────────────────
function computeBands(config: SectionCfg[]) {
  const total  = config.reduce((a, c) => a + c.scrolls, 0);
  let   cursor = 0;
  return config.map(c => {
    const start = cursor / total;
    const end   = (cursor + c.scrolls) / total;
    cursor += c.scrolls;
    return { start, end };
  });
}

function getTransformOrigin(align: string): string {
  switch (align) {
    case "top":    return "50% 0%";
    case "bottom": return "50% 100%";
    case "left":   return "0% 50%";
    case "right":  return "100% 50%";
    default:       return "50% 50%";
  }
}

function computeSectionVals(
  progress: number,
  band: { start: number; end: number },
  cfg: SectionCfg
): { scale: number; opacity: number; blur: number; tx: number; ty: number; zIndex: number; pointerEvents: string } {
  const { start, end } = band;
  const { peakAt, origin, peakScale } = cfg;
  const peak     = start + (end - start) * peakAt;
  let   halfBand = (end - start) * 0.5;
  let   norm     = (progress - peak) / halfBand;

  if (cfg.id === "hero") {
    if (progress < 0.045) {
      return { scale: 0.3, opacity: 0, blur: 15, tx: 0, ty: 0, zIndex: 0, pointerEvents: "none" };
    } else if (progress < peak) {
      const distFromPeak = progress - peak;
      norm = (distFromPeak / 0.018) * 1.5;
    }
  }

  let scale = 1, opacity = 1, blur = 0, tx = 0, ty = 0;

  const plateauStart = -0.15;
  const plateauEnd   =  0.08;

  const smoothstep = (t: number) => t * t * (3 - 2 * t);
  const easeIn     = (t: number) => t * t;

  if (norm < -1.5) {
    scale = 0.2; opacity = 0; blur = 20;
  } else if (norm < plateauStart) {
    const t = (norm + 1.5) / (1.5 + plateauStart);
    const e = smoothstep(t);

    scale   = 0.2 + (peakScale - 0.2) * e;
    opacity = Math.min(1, e * 1.5);
    blur    = (1 - e) * 20;

    const distance = (1 - e) * 400;
    if (origin === "left")   tx = -distance;
    if (origin === "right")  tx =  distance;
    if (origin === "top")    ty = -distance;
    if (origin === "bottom") ty =  distance;

  } else if (norm <= plateauEnd) {
    scale = peakScale; opacity = 1; blur = 0; tx = 0; ty = 0;

  } else if (norm < 1.2) {
    const t = (norm - plateauEnd) / (1.2 - plateauEnd);
    const e = easeIn(t);

    scale   = peakScale + (4 - peakScale) * e;
    opacity = Math.max(0, 1 - e * 1.5);
    blur    = e * 20;

    const distance = e * 500;
    if (origin === "left")   tx =  distance;
    if (origin === "right")  tx = -distance;
    if (origin === "top")    ty =  distance;
    if (origin === "bottom") ty = -distance;

  } else {
    scale = 4; opacity = 0; blur = 25;
  }

  opacity = Math.max(0, Math.min(1, opacity));

  const pointerEvents = opacity < 0.05 ? "none" : "auto";

  return {
    scale,
    opacity,
    blur,
    tx,
    ty,
    zIndex: Math.round((2 - Math.abs(norm)) * 10),
    pointerEvents
  };
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const skills = [
  "Agentic AI", "LangChain", "LangGraph", "LLMOps", "vLLM",
  "Model Context Protocol (MCP)", "RAG Systems and Vector DB", "LoRA / QLoRA",
  "Machine Learning", "Deep Learning", "PyTorch", "TensorFlow",
  "Python", "FastAPI", "Docker", "PostgreSQL"
];

const projects = [
  {
    title: "Sundae: Privacy first Personal Agentic AI Assistant",
    description: "A 2-layer orchestrated assistant using local Qwen3.6 via AirLLM and cloud LLMs. Features Neo4j graph memory, hybrid RAG, web scraping with Dockling, TTS/STT, and a WhatsApp interface.",
    stack: "LangGraph / MCP / AirLLM / Neo4j / Obsidian",
    href: "https://github.com/prajwalgowdavee/sundae"
  },
  {
    title: "Deep-Learning Based Early Diagnosis of ASD",
    description: "Published research (MLIP-2025) featuring a multi-modal DL pipeline. Built using hyperparameter-tuned SVC, Custom-FFNNs, and CNNs to analyze gene expression, fMRI, and facial imagery.",
    stack: "TensorFlow / PyTorch / PyCaret / SMOTE / OpenCV",
    href: "https://github.com/prajwalgowdavee/asd-multimodal"
  },
  {
    title: "AquaVision: Marine Creatures & Waste Detection",
    description: "Real-time computer vision system utilizing EfficientNetB7 for sea creature classification and YOLOv8 for oceanic trash detection to aid in marine biodiversity research.",
    stack: "YOLOv8 / EfficientNetB7 / OpenCV",
    href: "https://github.com/prajwalgowdavee/AquaVision1.0"
  }
];

type Role = { title: string; period: string; bullets: string[] };
type ExperienceData = { company: string; imageSrc: string; roles: Role[] };

const EXPERIENCE_DETAILS: Record<string, ExperienceData> = {
  tata: {
    company: "Tata Steel",
    imageSrc: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&h=400&fit=crop",
    roles: [
      {
        title: "Data Analyst Intern",
        period: "Oct 2024 - Nov 2024",
        bullets: [
          "Conducted EDA on large-scale operational datasets to surface KPI anomalies and resource utilisation patterns, delivering findings as Tableau and Excel reports to the Data Science team.",
        ],
      }
    ],
  },
  tejas: {
    company: "Tejas Networks",
    imageSrc: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=400&h=400&fit=crop",
    roles: [
      {
        title: "AI Engineer R&D",
        period: "Aug 2025 - Present",
        bullets: [
          "Architected a multi-agent AI from scratch, reducing average response latency to ~5s on a single entry-level GPU by tuning vLLM inference, custom routing, Redis caching, auto-scaling, and Langfuse observability across a 3-level agent orchestration stack.",
          "Engineered LangGraph state-machine-based dynamic report generation and on-demand dashboard/chart creation from natural language queries, eliminating manual reporting workflows.",
          "Delivered full project ownership in vanilla Python + selective LangChain/LangGraph, designing dynamic agent routing, persistent memory, and fallback logic across all platform layers.",
        ],
      },
      {
        title: "AI Engineer Intern",
        period: "Jan 2025 - Aug 2025",
        bullets: [
          "Deployed custom offline RAG pipeline achieving 97% answer accuracy with sub-second retrieval - serving SOPs, and tech docs with zero external API dependency by combining semantic chunking, OCR metadata extraction, embedding, and reranking.",
          "Improved retrieval precision significantly over baseline vector search by building custom retrievers with dynamic document chunking and multi-stage reranking, integrated as a dedicated retrieval agent in the multi-agent platform.",
        ],
      },
    ],
  },
};

// ─── FIREWORKS ────────────────────────────────────────────────────────────────
function FireworksOverlay({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    type Particle = { x: number; y: number; vx: number; vy: number; alpha: number; color: string; radius: number };
    const particles: Particle[] = [];

    const rootStyle = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
    const COLORS = [
      rootStyle?.getPropertyValue("--fireworks-color-1").trim() || "#ba5b38",
      rootStyle?.getPropertyValue("--fireworks-color-2").trim() || "#e8b943",
      rootStyle?.getPropertyValue("--fireworks-color-3").trim() || "#fff9ee",
      rootStyle?.getPropertyValue("--fireworks-color-4").trim() || "#7ec8a0",
      rootStyle?.getPropertyValue("--fireworks-color-5").trim() || "#6ec1e4",
      rootStyle?.getPropertyValue("--fireworks-color-6").trim() || "#e884b0",
      rootStyle?.getPropertyValue("--fireworks-color-7").trim() || "#a78bfa",
    ];

    function burst(x: number, y: number) {
      const count = 80 + Math.floor(Math.random() * 60);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 1 + Math.random() * 4;   // slower launch
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          radius: 2 + Math.random() * 3,
        });
      }
    }

    const positions = [[0.2,0.3],[0.5,0.2],[0.8,0.35],[0.35,0.55],[0.65,0.25],[0.5,0.5]];
    let burstIdx = 0;
    const burstInterval = setInterval(() => {
      if (burstIdx < positions.length) {
        burst(canvas.width * positions[burstIdx][0], canvas.height * positions[burstIdx][1]);
        burstIdx++;
      } else {
        clearInterval(burstInterval);
      }
    }, 500);   // more time between bursts

    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.06;    // gentler gravity → wider arc
        p.vx *= 0.99;    // less horizontal drag
        p.alpha -= 0.007; // fade out ~2× slower
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }

        // ── glow layer (large, blurred) ──────────────────────────────
        ctx.save();
        ctx.globalAlpha  = p.alpha * 0.6;
        ctx.shadowColor  = p.color;
        ctx.shadowBlur   = p.radius * 6;
        ctx.fillStyle    = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // ── sharp bright core ────────────────────────────────────────
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
      if (particles.length === 0 && burstIdx >= positions.length) {
        cancelAnimationFrame(animRef.current);
        onDone();
      }
    }
    animRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(animRef.current); clearInterval(burstInterval); };
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        "var(--z-fireworks)" as any,
        pointerEvents: "none",
      }}
    />
  );
}

// ─── DEV MODE HUD ─────────────────────────────────────────────────────────────
function DevModeHUD({ progress, config, onClose }: { progress: number; config: SectionCfg[]; onClose: () => void }) {
  const [fps, setFps]         = useState(0);
  const [visible, setVisible] = useState(false);
  const fpsRef  = useRef({ last: performance.now(), frames: 0 });
  const rafRef  = useRef<number>(0);

  useEffect(() => { const t = setTimeout(() => setVisible(true), 40); return () => clearTimeout(t); }, []);

  useEffect(() => {
    function tick() {
      const now = performance.now();
      fpsRef.current.frames++;
      if (now - fpsRef.current.last >= 500) {
        setFps(Math.round((fpsRef.current.frames * 1000) / (now - fpsRef.current.last)));
        fpsRef.current.frames = 0; fpsRef.current.last = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const bands = computeBands(config);
  let activeSectionIdx = 0, closestDist = Infinity;
  bands.forEach(({ start, end }, i) => {
    const peak = start + (end - start) * config[i].peakAt;
    const dist = Math.abs(progress - peak);
    if (dist < closestDist) { closestDist = dist; activeSectionIdx = i; }
  });
  const activeSection = config[activeSectionIdx];
  const { start, end } = bands[activeSectionIdx];
  const bandProgress = end > start ? ((progress - start) / (end - start)) * 100 : 0;
  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };

  return (
    <div style={{
      position:   "fixed",
      top:        "1rem",
      left:       "1rem",
      zIndex:     "var(--z-dev-hud)" as any,
      transform:  visible ? "translateY(0)" : "translateY(-20px)",
      opacity:    visible ? 1 : 0,
      transition: "transform 0.3s ease, opacity 0.3s ease",
      pointerEvents: "auto",
    }}>
      <div style={{
        background:    "var(--dev-hud-bg)",
        border:        `1px solid var(--dev-hud-border)`,
        borderRadius:  "var(--dev-hud-radius)",
        padding:       "var(--dev-hud-padding)",
        minWidth:      "var(--dev-hud-min-width)",
        fontFamily:    "'Space Grotesk',monospace",
        fontSize:      "12px",
        color:         "var(--dev-hud-text)",
        boxShadow:     "var(--dev-hud-shadow)",
        backdropFilter: "blur(12px)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <span style={{ color: "var(--dev-hud-accent)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "10px" }}>⚡ DEV MODE</span>
          <button onClick={handleClose} style={{ background: "none", border: "none", color: "var(--dev-hud-muted)", cursor: "pointer", fontSize: "14px", padding: 0, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
          <span style={{ color: "var(--dev-hud-muted)" }}>FPS</span>
          <span style={{ color: fps >= 55 ? "var(--dev-hud-fps-good)" : fps >= 30 ? "var(--dev-hud-fps-ok)" : "var(--dev-hud-fps-bad)", fontWeight: 700 }}>{fps}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
          <span style={{ color: "var(--dev-hud-muted)" }}>Scroll</span>
          <span style={{ color: "var(--dev-hud-fps-ok)", fontWeight: 700 }}>{(progress * 100).toFixed(1)}%</span>
        </div>
        <div style={{ height: "3px", background: "var(--dev-hud-divider)", borderRadius: "2px", marginBottom: "0.75rem", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--clay)", borderRadius: "2px", transition: "width 0.1s" }} />
        </div>
        <div style={{ borderTop: `1px solid var(--dev-hud-divider)`, paddingTop: "0.6rem", marginBottom: "0.4rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--dev-hud-muted)" }}>Section</span>
            <span style={{ color: "var(--dev-hud-text)", fontWeight: 600 }}>{navLabels[activeSection.id] ?? activeSection.id}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--dev-hud-muted)" }}>Band progress</span>
            <span style={{ color: "var(--dev-hud-text)" }}>{Math.max(0, Math.min(100, bandProgress)).toFixed(1)}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--dev-hud-muted)" }}>Origin</span>
            <span style={{ color: "#6ec1e4" }}>{activeSection.origin}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--dev-hud-muted)" }}>Peak scale</span>
            <span style={{ color: "#a78bfa" }}>{activeSection.peakScale}</span>
          </div>
        </div>
        <div style={{ borderTop: `1px solid var(--dev-hud-divider)`, paddingTop: "0.6rem" }}>
          {config.map((c, i) => {
            const { start: s, end: e } = bands[i];
            const p = e > s ? Math.max(0, Math.min(1, (progress - s) / (e - s))) : 0;
            const isActive = i === activeSectionIdx;
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: isActive ? "var(--clay)" : "var(--dev-hud-divider)", flexShrink: 0 }} />
                <span style={{ flex: 1, color: isActive ? "var(--dev-hud-text)" : "rgba(255,249,238,0.35)", fontSize: "11px" }}>{navLabels[c.id] ?? c.id}</span>
                <div style={{ width: "50px", height: "2px", background: "var(--dev-hud-divider)", borderRadius: "1px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p * 100}%`, background: isActive ? "var(--clay)" : "rgba(255,249,238,0.2)" }} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: "0.6rem", color: "rgba(255,249,238,0.2)", fontSize: "10px", textAlign: "center" }}>Konami activated · scroll to see live data</div>
      </div>
    </div>
  );
}

// ─── GOOGLY EYES ──────────────────────────────────────────────────────────────
type GooglyEye = { x: number; y: number; size: number; id: number; born: number };

function GooglyEyesOverlay({ onClose }: { onClose: () => void }) {
  const [eyes, setEyes]         = useState<GooglyEye[]>([]);
  const [mouse, setMouse]       = useState({ x: -9999, y: -9999 });
  const [clearing, setClearing] = useState(false);
  const idRef                   = useRef(0);
  const MAX_EYES = 250, SPAWN_MS = 3000, LINGER_MS = 600;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < MAX_EYES; i++) {
      const delay = (SPAWN_MS / MAX_EYES) * i + Math.random() * (SPAWN_MS / MAX_EYES) * 0.6;
      timers.push(setTimeout(() => {
        const size = 12 + Math.random() * 38, xMargin = size * 2.2, yMargin = size * 1.2;
        setEyes(prev => [...prev, { x: xMargin + Math.random() * (window.innerWidth - xMargin * 2), y: yMargin + Math.random() * (window.innerHeight - yMargin * 2), size, id: idRef.current++, born: Date.now() }]);
      }, delay));
    }
    timers.push(setTimeout(() => { setClearing(true); setTimeout(onClose, 500); }, SPAWN_MS + LINGER_MS));
    return () => timers.forEach(clearTimeout);
  }, [onClose]);

  useEffect(() => { const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY }); window.addEventListener("mousemove", onMove); return () => window.removeEventListener("mousemove", onMove); }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: "var(--z-googly)" as any, pointerEvents: "none" }}>
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible" }}>
        {eyes.map((pair) => {
          const r = pair.size, pr = r * 0.38, age = (Date.now() - pair.born) / 120;
          const scale = clearing ? 0 : Math.min(1, age);
          const leftEyeOffset = -r * 0.95, rightEyeOffset = r * 0.95;
          const lx = pair.x + leftEyeOffset, ly = pair.y;
          const lDx = mouse.x - lx, lDy = mouse.y - ly, lDist = Math.sqrt(lDx * lDx + lDy * lDy), lMax = r * 0.42;
          const lPx = lDist > 0 ? (lDx / lDist) * Math.min(lDist * 0.35, lMax) : 0, lPy = lDist > 0 ? (lDy / lDist) * Math.min(lDist * 0.35, lMax) : 0;
          const rx = pair.x + rightEyeOffset, ry = pair.y;
          const rDx = mouse.x - rx, rDy = mouse.y - ry, rDist = Math.sqrt(rDx * rDx + rDy * rDy), rMax = r * 0.42;
          const rPx = rDist > 0 ? (rDx / rDist) * Math.min(rDist * 0.35, rMax) : 0, rPy = rDist > 0 ? (rDy / rDist) * Math.min(rDist * 0.35, rMax) : 0;
          const eyeColor = `hsl(${(pair.id * 47) % 360},60%,40%)`;
          return (
            <g key={pair.id} transform={`translate(${pair.x}, ${pair.y}) scale(${scale.toFixed(3)})`} style={{ transition: clearing ? "transform 0.4s cubic-bezier(0.4,0,0.2,1)" : "transform 0.15s cubic-bezier(0.25,1,0.5,1)" }}>
              <g transform={`translate(${leftEyeOffset}, 0)`}>
                <circle r={r} fill="white" stroke="rgba(0,0,0,0.18)" strokeWidth={r * 0.07} />
                {r > 40 && <circle r={r * 0.92} fill="rgba(255,220,220,0.18)" />}
                <circle cx={lPx} cy={lPy} r={pr * 1.15} fill={eyeColor} /><circle cx={lPx} cy={lPy} r={pr} fill="#0a0a0a" />
                <circle cx={lPx + pr * 0.32} cy={lPy - pr * 0.32} r={pr * 0.32} fill="white" opacity={0.92} />
                <circle cx={lPx - pr * 0.18} cy={lPy + pr * 0.22} r={pr * 0.14} fill="white" opacity={0.5} />
              </g>
              <g transform={`translate(${rightEyeOffset}, 0)`}>
                <circle r={r} fill="white" stroke="rgba(0,0,0,0.18)" strokeWidth={r * 0.07} />
                {r > 40 && <circle r={r * 0.92} fill="rgba(255,220,220,0.18)" />}
                <circle cx={rPx} cy={rPy} r={pr * 1.15} fill={eyeColor} /><circle cx={rPx} cy={rPy} r={pr} fill="#0a0a0a" />
                <circle cx={rPx + pr * 0.32} cy={rPy - pr * 0.32} r={pr * 0.32} fill="white" opacity={0.92} />
                <circle cx={rPx - pr * 0.18} cy={rPy + pr * 0.22} r={pr * 0.14} fill="white" opacity={0.5} />
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── KONAMI ───────────────────────────────────────────────────────────────────
type KonamiEffect = "fireworks" | "devhud" | "googly";

function KonamiTrigger({ effect, progress, config, onDone }: { effect: KonamiEffect; progress: number; config: SectionCfg[]; onDone: () => void }) {
  if (effect === "fireworks") return <FireworksOverlay onDone={onDone} />;
  if (effect === "devhud")    return <DevModeHUD progress={progress} config={config} onClose={onDone} />;
  if (effect === "googly")    return <GooglyEyesOverlay onClose={onDone} />;
  return null;
}

function IdleNotification({ onClose, onContact }: { onClose: () => void; onContact: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);
  const handleClose   = () => { setVisible(false); setTimeout(onClose, 350); };
  const handleContact = () => { setVisible(false); setTimeout(() => { onClose(); onContact(); }, 350); };

  return (
    <div style={{
      position:      "fixed",
      inset:         0,
      zIndex:        "var(--z-idle)" as any,
      display:       "flex",
      alignItems:    "flex-end",
      justifyContent: "flex-end",
      padding:       "2rem",
      pointerEvents: "none",
    }}>
      <div style={{
        position:        "fixed",
        inset:           0,
        background:      "var(--idle-overlay-bg)",
        backdropFilter:  `blur(var(--idle-overlay-blur))`,
        WebkitBackdropFilter: `blur(var(--idle-overlay-blur))`,
        opacity:         visible ? 1 : 0,
        transition:      "var(--idle-overlay-transition)",
        pointerEvents:   visible ? "auto" : "none",
      }} onClick={handleClose} />

      <div style={{
        position:   "relative",
        width:      "var(--idle-card-width)",
        background: "var(--idle-card-bg)",
        border:     `1px solid var(--idle-card-border)`,
        borderRadius: "var(--idle-card-radius)",
        boxShadow:  "var(--idle-card-shadow)",
        padding:    "var(--idle-card-padding)",
        transform:  visible ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
        opacity:    visible ? 1 : 0,
        transition: "var(--idle-card-transition)",
        pointerEvents: "auto",
      }}>
        <button
          onClick={handleClose}
          style={{
            position:   "absolute",
            top:        "0.9rem",
            right:      "0.9rem",
            background: "var(--idle-close-bg)",
            border:     `1px solid var(--idle-close-border)`,
            color:      "var(--idle-close-color)",
            borderRadius: "var(--idle-close-radius)",
            width:      "var(--idle-close-size)",
            height:     "var(--idle-close-size)",
            cursor:     "pointer",
            display:    "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize:   "1rem",
            lineHeight: 1,
            transition: "background 0.2s,color 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(186,91,56,0.25)"; e.currentTarget.style.color = "#fff9ee"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--idle-close-bg)"; e.currentTarget.style.color = "var(--idle-close-color)"; }}
        >&times;</button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
          <div style={{
            width:          "var(--idle-avatar-size)",
            height:         "var(--idle-avatar-size)",
            borderRadius:   "var(--idle-avatar-radius)",
            background:     "var(--idle-avatar-bg)",
            border:         `1px solid var(--idle-avatar-border)`,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            flexShrink:     0,
            overflow:       "hidden",
          }}>
            <picture>
              <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/1f409/512.webp" type="image/webp" />
              <img
                src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f409/512.gif"
                alt="🐉"
                width="35"
                height="35"
                style={{ display: "block" }}
              />
            </picture>
          </div>

          <div>
            <p style={{ margin: 0, fontSize: "var(--idle-eyebrow-size)", letterSpacing: "var(--idle-eyebrow-tracking)", textTransform: "uppercase", color: "var(--idle-eyebrow-color)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600 }}>Still here?</p>
            <h3 style={{ margin: 0, fontSize: "var(--idle-title-size)", fontWeight: 700, color: "var(--idle-title-color)", fontFamily: "'Space Grotesk',sans-serif" }}>still reading? just ping me lol</h3>
          </div>
        </div>

        <p style={{ margin: "0 0 1.1rem", fontSize: "var(--idle-body-size)", color: "var(--idle-body-color)", lineHeight: "var(--idle-body-lh)", fontFamily: "'Space Grotesk',sans-serif" }}>You&apos;ve been here a while - If you like my work, you can just slide in my dm.</p>

        <button
          onClick={handleContact}
          style={{
            width:       "100%",
            padding:     "var(--idle-btn-padding)",
            background:  "var(--idle-btn-bg)",
            border:      "none",
            borderRadius: "var(--idle-btn-radius)",
            color:       "var(--idle-btn-color)",
            fontWeight:  "var(--idle-btn-weight)" as any,
            fontSize:    "var(--idle-btn-size)",
            cursor:      "pointer",
            fontFamily:  "'Space Grotesk',sans-serif",
            letterSpacing: "0.02em",
            transition:  "background 0.2s,transform 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--idle-btn-hover-bg)"; e.currentTarget.style.transform = "scale(1.02)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "var(--idle-btn-bg)"; e.currentTarget.style.transform = "scale(1)"; }}
        >Take me to Contact →</button>
      </div>
    </div>
  );
}

function ExperiencePopup({ expId, onClose }: { expId: string; onClose: () => void }) {
  const data = EXPERIENCE_DETAILS[expId];
  if (!data) return null;
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)");
  const [expandedIndex, setExpandedIndex]   = useState<number>(-1);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const rx = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -11;
    const ry = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 11;
    setTransformStyle(`perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.02)`);
  };

  return (
    <div
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        "var(--z-popup)" as any,
        display:       "flex",
        alignItems:    "center",
        justifyContent: "center",
        background:    "var(--popup-bg)",
        backdropFilter: `blur(var(--popup-blur))`,
        padding:       "1rem",
      }}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTransformStyle("perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)")}
        onClick={e => e.stopPropagation()}
        style={{
          position:       "relative",
          width:          "var(--popup-card-width)",
          maxWidth:       "100%",
          background:     "var(--popup-card-bg)",
          border:         `1px solid var(--popup-card-border)`,
          borderRadius:   "var(--popup-card-radius)",
          boxShadow:      "var(--popup-card-shadow)",
          overflow:       "hidden",
          transition:     "transform 150ms cubic-bezier(0.25,1,0.5,1)",
          transform:      transformStyle,
          transformStyle: "preserve-3d",
        }}
      >
        <div style={{ position: "relative", height: "var(--popup-header-height)", width: "100%", overflow: "hidden" }}>
          <img src={data.imageSrc} alt={data.company} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: "var(--popup-img-opacity)" as any }} />
          <div style={{ position: "absolute", bottom: "1rem", left: "1.5rem", right: "1.5rem", transform: "translateZ(30px)" }}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "2.6rem", color: "var(--popup-title-color)", margin: 0, textShadow: "var(--popup-title-shadow)" }}>{data.company}</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              position:   "absolute",
              top:        "1rem",
              right:      "1rem",
              background: "var(--popup-close-bg)",
              border:     `1px solid var(--popup-close-border)`,
              color:      "var(--popup-title-color)",
              borderRadius: "50%",
              width:      "var(--popup-close-size)",
              height:     "var(--popup-close-size)",
              cursor:     "pointer",
              display:    "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize:   "1.2rem",
              lineHeight: 1,
              zIndex:     10,
              transition: "background 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--clay)")}
            onMouseLeave={e => (e.currentTarget.style.background = "var(--popup-close-bg)")}
          >&times;</button>
        </div>

        <div
          style={{
            padding:     "var(--popup-padding)",
            transform:   "translateZ(20px)",
            maxHeight:   "var(--popup-max-scroll-h)",
            overflowY:   "auto",
          }}
          className="card-content-scroll"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {data.roles.map((role, idx) => {
              const isExpanded = expandedIndex === idx;
              return (
                <div
                  key={idx}
                  style={{
                    background:  "var(--popup-role-bg)",
                    border:      `1px solid ${isExpanded ? "var(--popup-role-border-active)" : "var(--popup-role-border)"}`,
                    borderRadius: "var(--popup-role-radius)",
                    overflow:    "hidden",
                    transition:  "all 0.3s ease",
                  }}
                >
                  <button
                    onClick={() => setExpandedIndex(isExpanded ? -1 : idx)}
                    style={{
                      width:      "100%",
                      background: "none",
                      border:     "none",
                      padding:    "1rem",
                      display:    "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor:     "pointer",
                      textAlign:  "left",
                      outline:    "none",
                    }}
                  >
                    <div>
                      <h4 style={{
                        margin:     0,
                        fontSize:   "var(--popup-role-title-size)",
                        fontWeight: 700,
                        color:      isExpanded ? "var(--popup-role-title-active)" : "var(--popup-role-title-color)",
                        transition: "color 0.2s",
                        fontFamily: "var(--font-sans)",
                      }}>{role.title}</h4>
                      <span style={{ fontSize: "var(--popup-role-period-size)", color: "var(--muted)", marginTop: "2px", display: "inline-block" }}>{role.period}</span>
                    </div>
                    <span style={{ fontSize: "1rem", color: "var(--clay)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                  </button>
                  <div style={{
                    maxHeight:  isExpanded ? "var(--popup-inner-max-h)" : "0px",
                    opacity:    isExpanded ? 1 : 0,
                    overflow:   "hidden",
                    transition: "max-height 0.35s cubic-bezier(0.25,1,0.5,1),opacity 0.3s ease",
                  }}>
                    <div style={{ padding: "0 1rem 1rem 1rem", borderTop: "1px solid rgba(255,249,238,0.05)", paddingTop: "0.75rem" }}>
                      <ul style={{
                        margin:         0,
                        paddingLeft:    "1.2rem",
                        color:          "var(--popup-body-color)",
                        fontSize:       "var(--popup-body-size)",
                        lineHeight:     "var(--popup-body-lh)",
                        display:        "flex",
                        flexDirection:  "column",
                        gap:            "0.5rem",
                      }}>
                        {role.bullets.map((b, bi) => <li key={bi}>{b}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DOCK ─────────────────────────────────────────────────────────────────────
const DOCK_SPRING: SpringOptions = { mass: 0.1, stiffness: 150, damping: 12 };
const DOCK_BASE_SIZE = 50, DOCK_MAG_SIZE = 76, DOCK_DISTANCE = 180;

export type DockItemData = { icon: React.ReactNode; label: string; onClick: () => void };

function DockItem({ item, mouseX }: { item: DockItemData; mouseX: MotionValue<number> }) {
  const ref     = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const distance   = useTransform(mouseX, (val) => { const rect = ref.current?.getBoundingClientRect() ?? { left: 0, width: DOCK_BASE_SIZE }; return val - rect.left - rect.width / 2; });
  const targetSize = useTransform(distance, [-DOCK_DISTANCE, 0, DOCK_DISTANCE], [DOCK_BASE_SIZE, DOCK_MAG_SIZE, DOCK_BASE_SIZE]);
  const size       = useSpring(targetSize, DOCK_SPRING);
  return (
    <motion.div ref={ref} role="button" tabIndex={0} className="dock-item" style={{ width: size, height: size }} onHoverStart={() => setHovered(true)} onHoverEnd={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)} onClick={item.onClick} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") item.onClick(); }} whileTap={{ scale: 0.88 }}>
      <div className="dock-icon">{item.icon}</div>
      <AnimatePresence>{hovered && <motion.div key="label" className="dock-label" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.15 }}>{item.label}</motion.div>}</AnimatePresence>
    </motion.div>
  );
}

function Dock({ items }: { items: DockItemData[] }) {
  const mouseX = useMotionValue(Infinity);
  return (
    <div className="dock-outer" onMouseMove={e => mouseX.set(e.pageX)} onMouseLeave={() => mouseX.set(Infinity)}>
      <div className="dock-panel">
        {items.map((item, i) => <DockItem key={i} item={item} mouseX={mouseX} />)}
      </div>
    </div>
  );
}

// ─── DEV PANEL ────────────────────────────────────────────────────────────────
function DevPanel({ config, onChange, onReset, onResetIndividual }: { config: SectionCfg[]; onChange: (i: number, k: string, v: number | string) => void; onReset: () => void; onResetIndividual: (i: number) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      position:      "fixed",
      bottom:        0,
      right:         0,
      width:         280,
      maxHeight:     "85vh",
      background:    "var(--dev-panel-bg)",
      backdropFilter: "blur(12px)",
      color:         "var(--dev-panel-text)",
      fontFamily:    "'Space Grotesk',monospace",
      fontSize:      11,
      zIndex:        "var(--z-dev-panel)" as any,
      borderRadius:  "var(--dev-panel-radius)",
      border:        `1px solid var(--dev-panel-border)`,
      borderRight:   "none",
      borderBottom:  "none",
      boxShadow:     "var(--dev-panel-shadow)",
      display:       "flex",
      flexDirection: "column",
    }}>
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "10px 12px",
          borderBottom:   `1px solid var(--dev-panel-divider)`,
          cursor:         "pointer",
          userSelect:     "none",
        }}
        onClick={() => setOpen(v => !v)}
      >
        <span style={{ fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 10, color: "var(--dev-panel-accent)" }}>⚙ Scroll Config</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); onReset(); }}
            style={{ background: "rgba(186,91,56,0.2)", border: `1px solid rgba(186,91,56,0.4)`, color: "var(--dev-panel-accent)", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 10 }}
          >reset all</button>
          <span style={{ opacity: 0.5, fontSize: 13, lineHeight: 1 }}>{open ? "▼" : "▲"}</span>
        </div>
      </div>
      {open && (
        <div style={{ overflowY: "auto", padding: "8px 12px 12px" }}>
          {config.map((c, i) => (
            <div key={c.id} style={{ borderBottom: `1px solid var(--dev-panel-divider)`, paddingBottom: 10, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: "var(--dev-panel-accent)", letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 10 }}>{navLabels[c.id] ?? c.id}</div>
                <button onClick={() => onResetIndividual(i)} style={{ background: "transparent", border: `1px solid var(--dev-panel-border)`, color: "var(--dev-panel-muted)", borderRadius: 4, padding: "2px 6px", cursor: "pointer", fontSize: 9 }}>reset</button>
              </div>
              {([["scale", "peakScale", 0.3, 1.5, 0.01], ["peak at", "peakAt", 0.1, 0.9, 0.05], ["scrolls", "scrolls", 50, 300, 10]] as const).map(([label, key, min, max, step]) => (
                <div key={String(key)} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ width: 44, color: "var(--dev-panel-muted)" , flexShrink: 0}}>{label}</span>
                  <input type="range" min={Number(min)} max={Number(max)} step={Number(step)} value={c[key as keyof SectionCfg] as number} onChange={e => onChange(i, String(key), +e.target.value)} style={{ flex: 1, accentColor: "var(--dev-panel-accent)" }} />
                  <span style={{ width: 34, textAlign: "right", color: "rgba(255,249,238,0.7)", flexShrink: 0 }}>{key === "peakAt" ? Math.round((c[key as keyof SectionCfg] as number) * 100) + "%" : String(c[key as keyof SectionCfg])}</span>
                </div>
              ))}
              {([["from", "origin", ORIGINS], ["align", "align", ALIGNS]] as const).map(([label, key, opts]) => (
                <div key={String(key)} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <span style={{ width: 44, color: "var(--dev-panel-muted)" , flexShrink: 0}}>{label}</span>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {(opts as readonly string[]).map(o => (
                      <button
                        key={o}
                        onClick={() => onChange(i, String(key), o)}
                        style={{
                          padding:     "2px 6px",
                          fontSize:    10,
                          borderRadius: 4,
                          border:      "1px solid",
                          cursor:      "pointer",
                          background:  c[key as keyof SectionCfg] === o ? "var(--dev-panel-accent)" : "transparent",
                          borderColor: c[key as keyof SectionCfg] === o ? "var(--dev-panel-accent)" : "var(--dev-panel-border)",
                          color:       c[key as keyof SectionCfg] === o ? "#fff9ee" : "var(--dev-panel-muted)",
                        }}
                      >{o}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button
            onClick={() => { navigator.clipboard.writeText(`const DEFAULT_CONFIG = ${JSON.stringify(config, null, 2)};`).then(() => alert("Config copied!")); }}
            style={{
              width:       "100%",
              padding:     "7px",
              marginTop:   4,
              background:  "rgba(186,91,56,0.15)",
              border:      `1px solid rgba(186,91,56,0.35)`,
              color:       "var(--dev-panel-accent)",
              borderRadius: 6,
              cursor:      "pointer",
              fontSize:    11,
              fontWeight:  700,
            }}
          >📋 Copy config to clipboard</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const [config, setConfig]       = useState<SectionCfg[]>(DEFAULT_CONFIG.map(c => ({ ...c })));
  const [activeExp, setActiveExp] = useState<string | null>(null);
  const [openProjectIdx, setOpenProjectIdx] = useState<number>(0);
  const [activeSectionId, setActiveSectionId] = useState<string>("hero");

  const [gltfScene,    setGltfScene]    = useState<THREE.Group | null>(null);
  const [bookEntered,  setBookEntered]  = useState(false);

  // ── Frame cache state ────────────────────────────────────────────────────
  const [scrubFrames,  setScrubFrames]  = useState<ImageBitmap[]>([]);
  const [loopFrames,   setLoopFrames]   = useState<ImageBitmap[]>([]);
  const [loadPhase,    setLoadPhase]    = useState<"extracting" | "caching" | "ready">("extracting");
  const [loadProgress, setLoadProgress] = useState(0);

  // ── Video parallax refs (zero-render path) ───────────────────────────────
  const scrollUnitsRef = useRef(0);
  const inLoopZoneRef  = useRef(false);

  // ── DOM refs for each section ─────────────────────────────────────────────
  const sectionRefs = useRef<(HTMLElement | null)[]>(DEFAULT_CONFIG.map(() => null));

  // ── Precomputed bands ─────────────────────────────────────────────────────
  const bands = useMemo(() => computeBands(config), [config]);

  // ── Transform origins ─────────────────────────────────────────────────────
  const transformOrigins = useMemo(
    () => config.map(c => getTransformOrigin(c.align)),
    [config]
  );

  // ── Last written values cache ─────────────────────────────────────────────
  const lastVals = useRef<Array<{ transform: string; opacity: string; filter: string; zIndex: string; pointerEvents: string }>>(
    DEFAULT_CONFIG.map(() => ({ transform: "", opacity: "", filter: "", zIndex: "", pointerEvents: "" }))
  );

  // ── Smooth scroll lerp refs ───────────────────────────────────────────────
  const targetProgress  = useRef(0);
  const currentProgress = useRef(0);
  const lerpRafRef      = useRef<number>(0);
  const lerpRunning     = useRef(false);

  const rawProgress   = useRef(0);
  const [devProgress, setDevProgress]   = useState(0);
  const devProgressThrottle             = useRef(0);

  const [showIdleNotif, setShowIdleNotif] = useState(false);
  const [audioMuted, setAudioMuted]       = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [ctxMenu, setCtxMenu]             = useState<{ x: number; y: number } | null>(null);
  const [konamiEffect, setKonamiEffect]   = useState<KonamiEffect | null>(null);
  const audioRef                          = useRef<HTMLAudioElement | null>(null);
  const konamiRef                         = useRef<string[]>([]);
  const KONAMI_SEQ = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  const EFFECTS: KonamiEffect[] = ["fireworks","devhud","googly"];

  // Contact form
  const [formName, setFormName]       = useState("");
  const [formEmail, setFormEmail]     = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formStatus, setFormStatus]   = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [formError, setFormError]     = useState("");

  const totalVh = config.reduce((a, c) => a + c.scrolls, 0);

  // ── Manual Scroll Restoration on mount ──────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.history && "scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);
    }
  }, []);

  // ── Lock scrolling while in Book Entry overlay ──────────────────────────
  useEffect(() => {
    if (!bookEntered) {
      window.scrollTo(0, 0);
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    } else {
      window.scrollTo(0, 0);
    }
  }, [bookEntered]);

  useEffect(() => {
    if (ENABLE_DEV_TOOLS) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof window !== "undefined" && /Mac|iPad|iPhone|iPod/.test(navigator.platform);
      const modifierKey = isMac ? e.metaKey : e.ctrlKey;

      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        return;
      }

      if (modifierKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.keyCode === 73)) {
        e.preventDefault();
        return;
      }

      if (modifierKey && e.shiftKey && (e.key === "J" || e.key === "j" || e.keyCode === 74)) {
        e.preventDefault();
        return;
      }

      if (modifierKey && e.shiftKey && (e.key === "C" || e.key === "c" || e.keyCode === 67)) {
        e.preventDefault();
        return;
      }

      if (modifierKey && (e.key === "U" || e.key === "u" || e.keyCode === 85)) {
        e.preventDefault();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // ── FRAME LOADING on mount ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db     = await idbOpen();
        const cached = await idbGet(db, IDB_CACHE_KEY);

        if (
          cached &&
          Date.now() - cached.timestamp < IDB_CACHE_TTL &&
          cached.scrubBlobs?.length === SCRUB_FRAME_COUNT &&
          cached.loopBlobs?.length  === LOOP_FRAME_COUNT
        ) {
          setLoadPhase("extracting");
          setLoadProgress(0.1);
          const glbPromise = new Promise<THREE.Group>((resolve, reject) => {
            new GLTFLoader().load(
              "/models/viking_book.glb",
              (gltf) => resolve(gltf.scene as THREE.Group),
              undefined,
              reject
            );
          });

          const [[sBitmaps, lBitmaps], glb] = await Promise.all([
            Promise.all([
              blobsToBitmaps(cached.scrubBlobs),
              blobsToBitmaps(cached.loopBlobs),
            ]),
            glbPromise,
          ]);
          if (cancelled) return;
          setScrubFrames(sBitmaps);
          setLoopFrames(lBitmaps);
          setGltfScene(glb);
          setLoadProgress(1);
          setLoadPhase("ready");
          return;
        }

        const glbPromise = new Promise<THREE.Group>((resolve, reject) => {
          new GLTFLoader().load(
            "/models/viking_book.glb",
            (gltf) => resolve(gltf.scene as THREE.Group),
            undefined,
            reject
          );
        });

        const { scrubFrames: sf, loopFrames: lf, scrubBlobs, loopBlobs } = await fetchAndCacheFrames(
          (p) => {
            if (!cancelled) setLoadProgress(p * 0.95);
          }
        );
        if (cancelled) return;

        // Wait for GLB too (almost certainly already done by now)
        const glb = await glbPromise;

        setScrubFrames(sf);
        setLoopFrames(lf);
        setGltfScene(glb);
        setLoadProgress(1.0);
        setLoadPhase("ready");

        try {
          await idbSet(db, IDB_CACHE_KEY, {
            timestamp:  Date.now(),
            scrubBlobs,
            loopBlobs,
          });
        } catch (e) {
          console.warn("Frame cache write failed:", e);
        }

      } catch (err) {
        console.warn("Frame loading error:", err);
        if (!cancelled) setLoadPhase("ready");
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── SCROLL DRIVER ─────────────────────────────────────────────────────────
  const driveScroll = useCallback((progress: number) => {
    const els  = sectionRefs.current;
    const last = lastVals.current;

    for (let i = 0; i < config.length; i++) {
      const el = els[i];
      if (!el) continue;

      const { scale, opacity, blur, tx, ty, zIndex, pointerEvents } = computeSectionVals(progress, bands[i], config[i]);

      const transform  = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${scale.toFixed(4)})`;
      const opacityStr = opacity.toFixed(4);
      const filterStr  = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : "none";
      const zIndexStr  = String(zIndex);

      const lv = last[i];
      if (lv.transform !== transform) { el.style.transform = transform; lv.transform = transform; }
      if (lv.opacity   !== opacityStr) { el.style.opacity   = opacityStr; lv.opacity   = opacityStr; }
      if (lv.filter    !== filterStr)  { el.style.filter    = filterStr;  lv.filter    = filterStr;  }
      if (lv.zIndex    !== zIndexStr)  { el.style.zIndex    = zIndexStr;  lv.zIndex    = zIndexStr;  }
      if (lv.pointerEvents !== pointerEvents) { el.style.pointerEvents = pointerEvents; lv.pointerEvents = pointerEvents; }
    }
  }, [config, bands]);

  // ── LERP TICK (runs every RAF while scrolling) ────────────────────────────
  const startLerpLoop = useCallback((configRef: SectionCfg[]) => {
    // Lerp factor: 0.10 = smooth & responsive. Lower = floatier, higher = snappier.
    const LERP_FACTOR = 0.10;

    const tick = () => {
      const diff = targetProgress.current - currentProgress.current;

      if (Math.abs(diff) < 0.000005) {
        currentProgress.current = targetProgress.current;
        lerpRunning.current = false;
        return;
      }

      currentProgress.current += diff * LERP_FACTOR;
      rawProgress.current = currentProgress.current;

      const su = currentProgress.current * TOTAL_SCROLL_UNITS;
      scrollUnitsRef.current = su;
      const lastScrubEnd = VIDEO_SCRUB_SECTIONS[VIDEO_SCRUB_SECTIONS.length - 1].scrollEnd;
      inLoopZoneRef.current = su >= lastScrubEnd;

      driveScroll(currentProgress.current);

      // Update active section based on lerped progress
      const bandsLocal = computeBands(configRef);
      let activeIdx = 0, closest = Infinity;
      bandsLocal.forEach(({ start, end }, i) => {
        const peak = start + (end - start) * configRef[i].peakAt;
        const dist = Math.abs(currentProgress.current - peak);
        if (dist < closest) { closest = dist; activeIdx = i; }
      });
      setActiveSectionId(configRef[activeIdx].id);

      if (ENABLE_DEV_TOOLS) {
        const now = performance.now();
        if (now - devProgressThrottle.current > 100) {
          devProgressThrottle.current = now;
          setDevProgress(currentProgress.current);
        }
      }

      lerpRafRef.current = requestAnimationFrame(tick);
    };

    lerpRafRef.current = requestAnimationFrame(tick);
  }, [driveScroll]);

  // ── Scroll listener — only updates the target, lerp loop does the rest ────
  useEffect(() => {
    const onScroll = () => {
      setActiveExp(null);

      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY > max) {
        window.scrollTo({ top: max, behavior: "instant" as ScrollBehavior });
        return;
      }

      const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      targetProgress.current = p;

      // Kick off the lerp loop only if it isn't already running
      if (!lerpRunning.current) {
        lerpRunning.current = true;
        startLerpLoop(config);
      }
    };

    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    window.addEventListener("scroll", onScroll, { passive: true });

    // Run once on mount to set initial state
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(lerpRafRef.current);
      lerpRunning.current = false;
      document.documentElement.style.overscrollBehavior = "";
      document.body.style.overscrollBehavior = "";
    };
  }, [driveScroll, config, startLerpLoop]);

  useEffect(() => {
    driveScroll(rawProgress.current);
    sectionRefs.current.forEach((el, i) => {
      if (el) el.style.transformOrigin = transformOrigins[i];
    });
    lastVals.current = DEFAULT_CONFIG.map(() => ({ transform: "", opacity: "", filter: "", zIndex: "", pointerEvents: "" }));
  }, [config, driveScroll, transformOrigins]);

  useEffect(() => {
    sectionRefs.current.forEach((el, i) => {
      if (el) {
        el.style.transformOrigin = transformOrigins[i];
        el.style.willChange      = "transform, opacity, filter";
      }
    });
  }, [transformOrigins]);

  // ── Idle notification ─────────────────────────────────────────────────────
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;
    let shown = false;
    const reset = () => {
      clearTimeout(idleTimer);
      if (shown) return;
      idleTimer = setTimeout(() => { if (!shown) { shown = true; setShowIdleNotif(true); } }, 120_000);
    };
    const events = ["scroll","mousemove","keydown","touchstart"] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(idleTimer); events.forEach(e => window.removeEventListener(e, reset)); };
  }, []);

  // ── Audio autoplay / mute handling ───────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = 0.75;
    audio.muted = audioMuted;

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        audio.muted = true;
        audio.play().catch(() => {});
        setAutoplayBlocked(true);
        setAudioMuted(true);
      });
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = audioMuted;
  }, [audioMuted]);

  useEffect(() => {
    if (!autoplayBlocked) return;
    const onUserGesture = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.muted = false;
      audio.play().catch(() => {});
      setAudioMuted(false);
      setAutoplayBlocked(false);
    };

    const events = ["click", "keydown", "touchstart"] as const;
    events.forEach(event => window.addEventListener(event, onUserGesture, { once: true, passive: true }));
    return () => events.forEach(event => window.removeEventListener(event, onUserGesture));
  }, [autoplayBlocked]);

  useEffect(() => {
    if (ENABLE_DEV_TOOLS) return;
    const onCtx   = (e: MouseEvent) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); };
    const onClose = () => setCtxMenu(null);
    window.addEventListener("contextmenu", onCtx);
    window.addEventListener("click", onClose);
    window.addEventListener("scroll", onClose, { passive: true });
    return () => { window.removeEventListener("contextmenu", onCtx); window.removeEventListener("click", onClose); window.removeEventListener("scroll", onClose); };
  }, []);

  // ── Konami code ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      konamiRef.current = [...konamiRef.current, e.key].slice(-10);
      if (konamiRef.current.join(",") === KONAMI_SEQ.join(",")) {
        setKonamiEffect(EFFECTS[Math.floor(Math.random() * EFFECTS.length)]);
        konamiRef.current = [];
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleChange           = (i: number, key: string, val: number | string) =>
    setConfig(prev => prev.map((c, idx) => idx === i ? { ...c, [key]: val } : c));
  const handleReset            = () => setConfig(DEFAULT_CONFIG.map(c => ({ ...c })));
  const handleResetIndividual  = (i: number) =>
    setConfig(prev => prev.map((c, idx) => idx === i ? { ...DEFAULT_CONFIG[i] } : c));

  const navTo = useCallback((id: string) => {
    const idx = config.findIndex(c => c.id === id);
    if (idx < 0) return;
    const total = config.reduce((a, c) => a + c.scrolls, 0);
    let cursor = 0;
    for (let i = 0; i < idx; i++) cursor += config[i].scrolls;
    const peakOffset = cursor + config[idx].scrolls * config[idx].peakAt;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: (peakOffset / total) * max, behavior: "smooth" });
  }, [config]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!formName.trim() || !formEmail.trim() || !formMessage.trim()) { setFormError("Please fill in all fields."); return; }
    setFormStatus("sending");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: formName, email: formEmail, message: formMessage }) });
      if (res.ok) { setFormStatus("sent"); setFormName(""); setFormEmail(""); setFormMessage(""); }
      else { const data = await res.json().catch(() => ({})); setFormError(data.error ?? "Something went wrong. Please try again."); setFormStatus("error"); }
    } catch { setFormError("Network error. Please try again."); setFormStatus("error"); }
  };

  const inputStyle: React.CSSProperties = {
    width:        "100%",
    padding:      "var(--cf-input-padding)",
    background:   "var(--cf-input-bg)",
    border:       "1px solid var(--cf-input-border)",
    borderRadius: "var(--cf-input-radius)",
    color:        "var(--cf-input-color)",
    fontSize:     "var(--cf-input-size)",
    fontFamily:   "'Space Grotesk', sans-serif",
    outline:      "none",
    boxSizing:    "border-box",
  };

  const socialItems: DockItemData[] = [
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#fff9ee" }}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>, label: "GitHub", onClick: () => window.open("https://github.com/prajwalgowdavee", "_blank") },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#fff9ee" }}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>, label: "LinkedIn", onClick: () => window.open("https://www.linkedin.com/in/ds-prajwal-gowda/", "_blank") },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#fff9ee" }}><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>, label: "@prajwal.btc", onClick: () => window.open("https://www.instagram.com/prajwal.btc/", "_blank") },
  ];

  const makeSectionRef = useCallback((index: number) => (el: HTMLElement | null) => {
    sectionRefs.current[index] = el;
    if (el) {
      el.style.transformOrigin = getTransformOrigin(config[index].align);
      el.style.willChange      = "transform, opacity, filter";
    }
  }, [config]);

  return (
  <>
    {/* Book entry — BookEntry controls its own unmount via setMounted(false) */}
    {gltfScene && (
      <BookEntry gltfScene={gltfScene} onDone={() => setBookEntered(true)} />
    )}
      <audio
        ref={audioRef}
        src="/audio/Zoltraak.mp3"
        preload="auto"
        loop
        autoPlay
        playsInline
        muted={audioMuted}
        style={{ position: "fixed", opacity: 0, pointerEvents: "none", width: 0, height: 0 }}
      />

      {/* ── Loading screen ── */}
      <LoadingScreen progress={loadProgress} phase={loadPhase} />

      <main style={{ height: `${totalVh}vh`, position: "relative", overflow: "hidden" }}>

        {/* ── Parallax Video (canvas-based) ── */}
        <ParallaxVideo
          scrubFrames={scrubFrames}
          loopFrames={loopFrames}
          scrollUnitsRef={scrollUnitsRef}
          inLoopZoneRef={inLoopZoneRef}
        />

        {/* ── Side nav ── */}
        <aside className="side-nav" aria-label="Section navigation" style={{ zIndex: "var(--z-sidenav)" as any }}>
          {config.map(item => (
            <a key={item.id} className={`nav-diamond ${activeSectionId === item.id ? "active" : ""}`} href={`#${item.id}`} onClick={e => { e.preventDefault(); navTo(item.id); }}>
              <span>{navLabels[item.id] ?? item.id}</span>
            </a>
          ))}
        </aside>

        <button
          type="button"
          className={`audio-toggle ${!audioMuted ? "playing" : "muted"}`}
          aria-label={audioMuted ? "Unmute ambient music" : "Mute ambient music"}
          onClick={() => {
            setAudioMuted(prev => !prev);
          }}
          style={{ zIndex: 99999 }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {/* Left dot */}
            <circle cx="3" cy="12" r="2.5" className="dot dot-left" />
            {/* Center dot */}
            <circle cx="12" cy="12" r="2.5" className="dot dot-center" />
            {/* Right dot */}
            <circle cx="21" cy="12" r="2.5" className="dot dot-right" />
            {/* Muted line - single diagonal */}
            {audioMuted && (
              <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" />
            )}
          </svg>
          {audioMuted ? "Unmute" : "Mute"}
        </button>

        {/* ── Hero ── */}
        <section
          ref={makeSectionRef(0)}
          className="hero section-shell"
          id="hero"
          style={{ position: "fixed", inset: 0, zIndex: "var(--z-sections)" as any }}
        >
          <div className="hero-copy">
            <p className="eyebrow">Agentic AI / AI systems / Useful intelligence</p>
            <div style={{ width: "100%", maxWidth: "var(--hero-name-max-width)" }}>
              <MetallicName name="Prajwal Gowda D S" height="185px" seed={7} scale={3.5} speed={0.25} liquid={0.85} brightness={1.8} contrast={0.7} refraction={0.018} blur={0.012} lightColor="#cccccc" darkColor="#050505" tintColor="#8a939e" fresnel={1.2} waveAmplitude={0.9} chromaticSpread={2.5} />
            </div>
            <p className="title-pill">AI Engineer</p>
            <p className="hero-tagline">Scroll to Start</p>
          </div>
        </section>

        {/* ── About ── */}
        <section
          ref={makeSectionRef(1)}
          className="section-shell split"
          id="about"
          style={{ position: "fixed", inset: 0, zIndex: "var(--z-sections)" as any }}
        >
          <div>
            <p className="eyebrow" style={{ marginBottom: "0.25rem" }}>About Me</p>
            <h2 style={{ marginBottom: "2.5rem", marginTop: "0.5rem" }}>Just managing ecosystems and running side quests.</h2>
            <p style={{ margin: "0 0 1rem 0" }}>Currently building agentic AI, ML, and DL. No deep lore or favorite part of the stack. I just lock in and get it done.</p>
            <div style={{ margin: "1rem 0" }}>
              <p style={{ margin: "0 0 0.5rem 0", fontWeight: "bold" }}>Current side quests:</p>
              <ul style={{ listStyleType: "none", paddingLeft: "0", margin: "0", lineHeight: "var(--about-list-lh)" }}>
                <li style={{ marginBottom: "var(--about-list-gap)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <img src="/images/fih_2.gif" alt="🐱🐟" width="24" height="24" style={{ display: "block", borderRadius: "50%", objectFit: "cover" }} />
                  <span>Keeping my fish, cat and aquascapes alive</span>
                </li>
                <li style={{ marginBottom: "var(--about-list-gap)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <picture style={{ display: "flex", alignItems: "center" }}><source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/1f33f/512.webp" type="image/webp" /><img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f33f/512.gif" alt="🌿" width="24" height="24" style={{ display: "block" }} /></picture>
                  <span>Tending to my garden</span>
                </li>
                <li style={{ marginBottom: "var(--about-list-gap)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <picture style={{ display: "flex", alignItems: "center" }}><source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/1f47e/512.webp" type="image/webp" /><img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f47e/512.gif" alt="👾" width="24" height="24" style={{ display: "block" }} /></picture>
                  <span>PC gaming (lowkey raging)</span>
                </li>
              </ul>
            </div>
            <p style={{ margin: "1rem 0 0 0" }}>Just trying to automate my workflow so I can spend more time staring at my fish tanks.</p>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <ProfileCard name="Prajwal Gowda D S" title="AI Engineer" handle="prajwalgowdavee" status="Building AI Agents" contactText="Contact Me" avatarUrl="/images/profile_pic.jfif" showUserInfo enableTilt={true} enableMobileTilt onContactClick={() => navTo("contact")} behindGlowColor="rgba(186, 91, 56, 0.65)" behindGlowEnabled innerGradient="linear-gradient(145deg, rgba(186, 91, 56, 0.25) 0%, rgba(255, 249, 238, 0.04) 100%)" />
          </div>
        </section>

        {/* ── Skills ── */}
        <section
          ref={makeSectionRef(2)}
          className="section-shell"
          id="skills"
          style={{ position: "fixed", inset: 0, zIndex: "var(--z-sections)" as any }}
        >
          <p className="eyebrow">Skills</p>
          <h2>Technical stack with teeth.</h2>
          <div className="skill-grid">
            {skills.map(skill => <div className="skill-card" key={skill}>{skill}</div>)}
          </div>
        </section>

        {/* ── Projects ── */}
        <section
          ref={makeSectionRef(3)}
          className="section-shell"
          id="projects"
          style={{ position: "fixed", inset: 0, zIndex: "var(--z-sections)" as any }}
        >
          <p className="eyebrow">Projects / Work</p>
          <h2 className="projects-heading">
            Selected AI builds.
          </h2>
          <div className="project-grid">
            {projects.map((project, idx) => (
              <details
                className="project-card"
                key={project.title}
                open={openProjectIdx === idx}
              >
                <summary onClick={(e) => {
                  e.preventDefault();
                  setOpenProjectIdx(openProjectIdx === idx ? -1 : idx);
                }}>
                  {project.title}
                </summary>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
                  <p style={{ margin: 0 }}>{project.stack}</p>
                  <span>{project.description}</span>
                  <a href={project.href} target="_blank" rel="noopener noreferrer" style={{ marginTop: "0.5rem" }}>
                    Open case study
                  </a>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── Experience ── */}
        <section
          ref={makeSectionRef(4)}
          className="section-shell"
          id="experience"
          style={{ position: "fixed", inset: 0, zIndex: "var(--z-sections)" as any }}
        >
          <p className="eyebrow">Career / Experience</p>
          <h2>Map of the journey.</h2>
          <p>Click to view details.</p>
          <div
            className="map-scroll-container"
            style={{
              position:   "relative",
              width:      "100%",
              overflowX:  "auto",
              overflowY:  "hidden",
              borderRadius: "var(--map-container-radius)",
              marginTop:  "2.5rem",
              padding:    "var(--map-container-pt) 0",
            }}
          >
            <div className="dsj_nav" data-nav="1">
              <button onClick={() => setActiveExp("tata")} className="item item1" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", outline: "none", fontFamily: "inherit" }}>
                <div className="txt">Tata Steel</div><div className="dot"></div>
              </button>
              <button onClick={() => setActiveExp("tejas")} className="item item2 on" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", outline: "none", fontFamily: "inherit" }}>
                <div className="dot"></div><div className="txt">Tejas Networks</div>
              </button>
              <div className="item lock">
                <div className="txt"><i></i>Stay tuned!</div><div className="dot"></div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Resume ── */}
        <section
          ref={makeSectionRef(5)}
          className="section-shell resume-band"
          id="resume"
          style={{
            position:   "fixed",
            inset:      0,
            background: "transparent",
            boxShadow:  "none",
            border:     "none",
            zIndex:     "var(--z-sections)" as any,
          }}
        >
          <div>
            <p className="eyebrow">Resume / CV</p>
            <h2>Need the concise version?</h2>
            <p>Click the download button to download it directly.</p>
          </div>
          <a
            className="button primary"
            href="/resume.pdf"
            download
            style={{ fontSize: "var(--resume-btn-size)", padding: "var(--resume-btn-padding)" }}
          >Download Resume</a>
        </section>

        {/* ── Contact ── */}
        <section
          ref={makeSectionRef(6)}
          className="section-shell contact"
          id="contact"
          style={{ position: "fixed", inset: 0, zIndex: "var(--z-sections)" as any }}
        >
          <p className="eyebrow" style={{ marginBottom: "0.25rem" }}>Contact</p>
          <h2 style={{ marginTop: "0px", marginBottom: "0.75rem" }}>Let&apos;s build something intelligent.</h2>
          <div className="contact-panel" style={{ marginTop: "0px", marginBottom: "0.75rem" }}>
            {formStatus === "sent" ? (
              <div style={{
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                gap:            "0.75rem",
                padding:        "var(--cf-sent-padding)",
                textAlign:      "center",
                background:     "var(--cf-sent-bg)",
                border:         `1px solid var(--cf-sent-border)`,
                borderRadius:   "var(--cf-sent-radius)",
              }}>
                <div style={{ fontSize: "var(--cf-sent-icon-size)" }}>✅</div>
                <h3 style={{ margin: 0, color: "var(--cf-sent-title-color)", fontFamily: "var(--font-display)" }}>Message sent!</h3>
                <p style={{ margin: 0, color: "var(--cf-sent-body-color)", fontSize: "var(--cf-sent-body-size)" }}>I&apos;ll get back to you soon.</p>
                <button
                  onClick={() => setFormStatus("idle")}
                  style={{
                    marginTop:    "0.5rem",
                    padding:      "var(--cf-resend-padding)",
                    background:   "var(--cf-resend-bg)",
                    border:       `1px solid var(--cf-resend-border)`,
                    borderRadius: "var(--cf-resend-radius)",
                    color:        "var(--cf-resend-color)",
                    cursor:       "pointer",
                    fontFamily:   "'Space Grotesk',sans-serif",
                    fontSize:     "var(--cf-resend-size)",
                  }}
                >Send another</button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <label style={{
                  display:       "flex",
                  flexDirection: "column",
                  gap:           "0.3rem",
                  fontSize:      "var(--cf-label-size)",
                  color:         "var(--cf-label-color)",
                  fontFamily:    "'Space Grotesk',sans-serif",
                  letterSpacing: "var(--cf-label-tracking)",
                  textTransform: "uppercase",
                }}>
                  Name
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Your name" type="text" className="contact-form-input" style={inputStyle} />
                </label>
                <label style={{
                  display:       "flex",
                  flexDirection: "column",
                  gap:           "0.3rem",
                  fontSize:      "var(--cf-label-size)",
                  color:         "var(--cf-label-color)",
                  fontFamily:    "'Space Grotesk',sans-serif",
                  letterSpacing: "var(--cf-label-tracking)",
                  textTransform: "uppercase",
                }}>
                  Email
                  <input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="you@example.com" type="email" className="contact-form-input" style={inputStyle} />
                </label>
                <label style={{
                  display:       "flex",
                  flexDirection: "column",
                  gap:           "0.3rem",
                  fontSize:      "var(--cf-label-size)",
                  color:         "var(--cf-label-color)",
                  fontFamily:    "'Space Grotesk',sans-serif",
                  letterSpacing: "var(--cf-label-tracking)",
                  textTransform: "uppercase",
                }}>
                  Message
                  <textarea value={formMessage} onChange={e => setFormMessage(e.target.value)} placeholder="Tell me what you want to build" className="contact-form-input" style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }} />
                </label>
                {formError && <p style={{ color: "var(--cf-error-color)", fontSize: "var(--cf-error-size)", margin: 0, fontFamily: "'Space Grotesk',sans-serif" }}>{formError}</p>}
                <button
                  type="submit"
                  disabled={formStatus === "sending"}
                  className="button primary"
                  style={{ opacity: formStatus === "sending" ? 0.6 : 1, cursor: formStatus === "sending" ? "default" : "pointer", transition: "opacity 0.2s" }}
                >
                  {formStatus === "sending" ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
            <div className="direct-contact">
              <p>Prefer email?</p>
              <a href="mailto:prajwalgowdads2709@gmail.com" style={{ fontSize: "clamp(1.5rem,2vw,1.35rem)" }}>prajwalgowdads2709@gmail.com</a>
            </div>
          </div>
          <Dock items={socialItems} />
        </section>

        {/* ── Meme Cats Game ── */}
        <section
          ref={makeSectionRef(7)}
          id="memegame"
          style={{
            position:       "fixed",
            inset:          0,
            padding:        0,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "center",
            textAlign:      "center",
            zIndex:         "var(--z-sections)" as any,
          }}
        >
          <p className="eyebrow" style={{ marginBottom: "0.4rem", textAlign: "center" }}>Just for fun</p>

          <p style={{
            fontFamily: "var(--font-display)",
            fontSize:   "var(--memegame-title-size)",
            fontWeight: 800,
            lineHeight: 1.2,
            color:      "var(--ink)",
            margin:     "0 0 0.4rem",
            textAlign:  "center",
            display:    "flex",
            alignItems: "center",
            justifyContent: "center",
            gap:        "0.4rem",
          }}>
            Think you know your meme cats?{" "}
            <img
              src="/images/cat_dance.gif"
              alt="dancing cat"
              width="36"
              height="36"
              style={{ display: "inline-block", borderRadius: "50%", objectFit: "cover", verticalAlign: "middle" }}
            />
          </p>

          <p style={{ marginBottom: "1.25rem", color: "var(--memegame-body-color)", fontSize: "var(--memegame-body-size)", textAlign: "center" }}>
            A little game before you go. No pressure, unless you lose.
          </p>

          {/* Iframe with thumbnail overlay */}
          <div
            style={{
              position:     "relative",
              width:        "500px",
              maxWidth:     "100%",
              height:       "380px",
              borderRadius: "var(--memegame-radius)",
              overflow:     "hidden",
              border:       `1px solid var(--memegame-border)`,
              boxShadow:    "var(--memegame-shadow)",
            }}
          >
            {/* The actual iframe — always mounted so click can reach it */}
            <iframe
              id="memegame-iframe"
              style={{
                position: "absolute",
                inset:    0,
                width:    "100%",
                height:   "100%",
                border:   "none",
                display:  "block",
              }}
              src="https://wordwall.net/embed/776b1b424ff349d48ce0a887d4df97ab?themeId=59&templateId=5&fontStackId=0"
              frameBorder="0"
              allowFullScreen
            />

            {/* Thumbnail overlay — hidden after first click */}
            <div
              id="memegame-overlay"
              onClick={() => {
                const overlay = document.getElementById("memegame-overlay");
                const iframe  = document.getElementById("memegame-iframe") as HTMLIFrameElement | null;
                if (overlay) overlay.style.display = "none";
                if (iframe && iframe.contentWindow) {
                  iframe.contentWindow.focus();
                  iframe.contentDocument?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
                }
              }}
              style={{
                position:   "absolute",
                inset:      0,
                cursor:     "pointer",
                display:    "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Thumbnail image */}
              <img
                src="/images/cat_meme_collage.webp"
                alt="Click to play"
                style={{
                  position:   "absolute",
                  inset:      0,
                  width:      "100%",
                  height:     "100%",
                  objectFit:  "cover",
                }}
              />

              {/* Dark scrim so play button pops */}
              <div style={{
                position:        "absolute",
                inset:           0,
                background:      "rgba(0,0,0,0.35)",
                transition:      "background 0.2s",
              }} />

              {/* Play button */}
              <div style={{
                position:        "relative",
                zIndex:          1,
                width:           "64px",
                height:          "64px",
                borderRadius:    "50%",
                background:      "rgba(255,255,255,0.92)",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                boxShadow:       "0 4px 24px rgba(0,0,0,0.35)",
                transition:      "transform 0.15s, box-shadow 0.15s",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1.1)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 32px rgba(0,0,0,0.45)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.35)";
                }}
              >
                {/* Triangle play icon */}
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <polygon points="6,3 21,12 6,21" fill="#222" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ── Experience Popup ── */}
        {activeExp && <ExperiencePopup expId={activeExp} onClose={() => setActiveExp(null)} />}

        {/* ── Idle Notification ── */}
        {showIdleNotif && <IdleNotification onClose={() => setShowIdleNotif(false)} onContact={() => navTo("contact")} />}

        {/* ── Right-click Context Menu ── */}
        {ctxMenu && (
          <div
            style={{
              position:      "fixed",
              top:           Math.min(ctxMenu.y, window.innerHeight - 220),
              left:          Math.min(ctxMenu.x, window.innerWidth - 240),
              zIndex:        "var(--z-ctx-menu)" as any,
              background:    "var(--ctx-bg)",
              border:        `1px solid var(--ctx-border)`,
              borderRadius:  "var(--ctx-radius)",
              padding:       "var(--ctx-padding)",
              minWidth:      "var(--ctx-min-width)",
              boxShadow:     "var(--ctx-shadow)",
              fontFamily:    "'Space Grotesk',sans-serif",
              fontSize:      "13px",
              backdropFilter: `blur(var(--ctx-blur))`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {["Back","Forward","Reload page","Save as…","Print…","View page source","Inspect"].map(item => (
              <div key={item} style={{ padding: "var(--ctx-item-padding)", color: "var(--ctx-item-color)", cursor: "default", userSelect: "none" }}>{item}</div>
            ))}
            <div style={{ height: "1px", background: "var(--ctx-divider)", margin: "4px 0" }} />
            <div
              onClick={() => { setCtxMenu(null); navTo("contact"); }}
              style={{
                padding:      "var(--ctx-cta-padding)",
                color:        "var(--ctx-cta-color)",
                cursor:       "pointer",
                fontWeight:   "var(--ctx-cta-weight)" as any,
                borderRadius: "var(--ctx-cta-radius)",
                transition:   "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--ctx-cta-hover)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >nice try 👀 just use the contact form if you like my work</div>
          </div>
        )}

        {/* ── Konami Effect ── */}
        {konamiEffect && (
          <KonamiTrigger effect={konamiEffect} progress={devProgress} config={config} onDone={() => setKonamiEffect(null)} />
        )}

        {/* ── Dev Panel ── */}
        {ENABLE_DEV_TOOLS && (
          <DevPanel config={config} onChange={handleChange} onReset={handleReset} onResetIndividual={handleResetIndividual} />
        )}

      </main>
    </>
  );
}

// ─── CONCURRENT FRAME FETCHING ────────────────────────────────────────────────
async function fetchAndCacheFrames(
  onProgress: (p: number) => void
): Promise<{ scrubFrames: ImageBitmap[]; loopFrames: ImageBitmap[]; scrubBlobs: Blob[]; loopBlobs: Blob[] }> {
  const totalFrames = SCRUB_FRAME_COUNT + LOOP_FRAME_COUNT;
  let done = 0;

  const scrubUrls = Array.from(
    { length: SCRUB_FRAME_COUNT },
    (_, i) => `/frames/scrub_${String(i + 1).padStart(4, "0")}.webp`
  );
  const loopUrls = Array.from(
    { length: LOOP_FRAME_COUNT },
    (_, i) => `/frames/loop_${String(i + 1).padStart(4, "0")}.webp`
  );
  const allUrls = [...scrubUrls, ...loopUrls];

  const CONCURRENCY_LIMIT = 15;
  const bitmaps: ImageBitmap[] = new Array(allUrls.length);
  const blobs: Blob[] = new Array(allUrls.length);

  let index = 0;
  async function worker() {
    while (index < allUrls.length) {
      const currentIndex = index++;
      const url = allUrls[currentIndex];
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        blobs[currentIndex] = blob;
        bitmaps[currentIndex] = await createImageBitmap(blob);
      } catch (err) {
        console.warn(`Failed to load frame ${url}:`, err);
        const canvas = new OffscreenCanvas(FRAME_WIDTH, FRAME_HEIGHT);
        bitmaps[currentIndex] = await createImageBitmap(canvas);
        blobs[currentIndex] = new Blob();
      }
      done++;
      onProgress(done / totalFrames);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY_LIMIT }, worker));

  return {
    scrubFrames: bitmaps.slice(0, SCRUB_FRAME_COUNT),
    loopFrames: bitmaps.slice(SCRUB_FRAME_COUNT),
    scrubBlobs: blobs.slice(0, SCRUB_FRAME_COUNT),
    loopBlobs: blobs.slice(SCRUB_FRAME_COUNT),
  };
}