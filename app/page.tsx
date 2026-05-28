"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

// ─── SCROLL CONFIG ────────────────────────────────────────────────────────────
const DEFAULT_CONFIG = [
  { "id": "hero",       "scrolls": 150, "peakAt": 0.5, "origin": "center", "align": "center", "peakScale": 1.35 },
  { "id": "about",      "scrolls": 150, "peakAt": 0.5, "origin": "bottom", "align": "center", "peakScale": 1    },
  { "id": "skills",     "scrolls": 150, "peakAt": 0.5, "origin": "left",   "align": "center", "peakScale": 0.9  },
  { "id": "projects",   "scrolls": 150, "peakAt": 0.5, "origin": "top",    "align": "center", "peakScale": 0.9  },
  { "id": "experience", "scrolls": 150, "peakAt": 0.5, "origin": "bottom", "align": "center", "peakScale": 1    },
  { "id": "resume",     "scrolls": 150, "peakAt": 0.5, "origin": "center", "align": "center", "peakScale": 0.85 },
  { "id": "contact",    "scrolls": 150, "peakAt": 0.5, "origin": "center", "align": "top",    "peakScale": 0.75 },
  { "id": "memegame",   "scrolls": 280, "peakAt": 0.42,"origin": "bottom", "align": "center", "peakScale": 1    },
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

const skills = [
  "Machine Learning","Python","LLMs","Prompt Engineering",
  "Vector Databases","RAG Systems","Deep Learning","Data Pipelines",
  "APIs","Model Evaluation","MLOps","Automation",
];

const projects = [
  { title: "RAG Knowledge Assistant",  description: "A retrieval-augmented AI assistant that turns private documents into fast, cited answers for teams.", stack: "LLMs / Embeddings / Vector Search", href: "#contact" },
  { title: "AI Workflow Copilot",       description: "Automation layer that connects APIs, summarizes decisions, and helps teams reduce repetitive knowledge work.", stack: "Python / Agents / APIs", href: "#contact" },
  { title: "ML Insight Dashboard",      description: "A model-monitoring dashboard for tracking quality signals, drift patterns, and business-facing outcomes.", stack: "ML / Analytics / Visualization", href: "#contact" },
];

// ─── EXPERIENCE DATA ──────────────────────────────────────────────────────────
type Role = { title: string; period: string; bullets: string[] };
type ExperienceData = { company: string; imageSrc: string; roles: Role[] };

const EXPERIENCE_DETAILS: Record<string,ExperienceData> = {
  tata: {
    company: "Tata Steel",
    imageSrc: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&h=400&fit=crop",
    roles: [{
      title: "AI Intern", period: "Jan 2024 - Jun 2024",
      bullets: [
        "Developed computer vision models for product quality defect detection, reducing manual inspection cycles.",
        "Implemented structural anomaly detection pipelines on heavy machinery telemetry using isolation forests.",
        "Partnered with R&D teams to streamline edge deployment and latency monitoring pipelines.",
      ],
    }],
  },
  tejas: {
    company: "Tejas Networks",
    imageSrc: "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=400&h=400&fit=crop",
    roles: [
      {
        title: "AI Engineer R&D", period: "Jul 2025 - Present",
        bullets: [
          "Architecting custom generative AI pipelines and custom RAG architectures for telecommunication edge operations.",
          "Deploying and optimization-tuning lightweight LLMs to parse and interpret deep, real-time hardware telemetry.",
          "Building multi-agent workspaces for log parsing and automated network diagnostic resolution.",
        ],
      },
      {
        title: "AI Intern", period: "Jan 2025 - Jun 2025",
        bullets: [
          "Constructed proof-of-concept AI troubleshooting agents to process fiber optical transport network telemetry alarms.",
          "Devised indexing processes utilizing state-of-the-art text embeddings to enhance context-retrieval accuracy.",
        ],
      },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── KONAMI EFFECT 1 — FIREWORKS ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function FireworksOverlay({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    type Particle = {
      x: number; y: number; vx: number; vy: number;
      alpha: number; color: string; radius: number;
    };

    const particles: Particle[] = [];
    const COLORS = ["#ba5b38","#e8b943","#fff9ee","#7ec8a0","#6ec1e4","#e884b0","#a78bfa"];

    function burst(x: number, y: number) {
      const count = 80 + Math.floor(Math.random() * 60);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = 2 + Math.random() * 7;
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

    // Fire 6 bursts staggered
    const positions = [
      [0.2, 0.3],[0.5, 0.2],[0.8, 0.35],
      [0.35,0.55],[0.65,0.25],[0.5, 0.5],
    ];
    let burstIdx = 0;
    const burstInterval = setInterval(() => {
      if (burstIdx < positions.length) {
        burst(canvas.width * positions[burstIdx][0], canvas.height * positions[burstIdx][1]);
        burstIdx++;
      } else {
        clearInterval(burstInterval);
      }
    }, 200);

    function draw() {
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.12; // gravity
        p.vx *= 0.98;
        p.alpha -= 0.013;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle   = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(draw);
      if (particles.length === 0 && burstIdx >= positions.length) {
        cancelAnimationFrame(animRef.current);
        onDone();
      }
    }
    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      clearInterval(burstInterval);
    };
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none" }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── KONAMI EFFECT 2 — DEV MODE HUD ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
function DevModeHUD({
  progress,
  config,
  onClose,
}: {
  progress: number;
  config: SectionCfg[];
  onClose: () => void;
}) {
  const [fps, setFps]           = useState(0);
  const [visible, setVisible]   = useState(false);
  const fpsRef                  = useRef({ last: performance.now(), frames: 0 });
  const rafRef                  = useRef<number>(0);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    function tick() {
      const now = performance.now();
      fpsRef.current.frames++;
      if (now - fpsRef.current.last >= 500) {
        setFps(Math.round((fpsRef.current.frames * 1000) / (now - fpsRef.current.last)));
        fpsRef.current.frames = 0;
        fpsRef.current.last = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // figure out current section
  const bands = computeBands(config);
  let activeSectionIdx = 0;
  let closestDist = Infinity;
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
    <div
      style={{
        position: "fixed", top: "1rem", left: "1rem", zIndex: 9998,
        transform: visible ? "translateY(0)" : "translateY(-20px)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.3s ease, opacity 0.3s ease",
        pointerEvents: "auto",
      }}
    >
      <div style={{
        background: "rgba(10,16,12,0.97)", border: "1px solid rgba(186,91,56,0.4)",
        borderRadius: "14px", padding: "1rem 1.2rem", minWidth: "260px",
        fontFamily: "'Space Grotesk', monospace", fontSize: "12px",
        color: "#fff9ee", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        backdropFilter: "blur(12px)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <span style={{ color: "#ba5b38", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "10px" }}>
            ⚡ DEV MODE
          </span>
          <button onClick={handleClose} style={{ background: "none", border: "none", color: "rgba(255,249,238,0.4)", cursor: "pointer", fontSize: "14px", padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        {/* FPS */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
          <span style={{ color: "rgba(255,249,238,0.45)" }}>FPS</span>
          <span style={{ color: fps >= 55 ? "#7ec8a0" : fps >= 30 ? "#e8b943" : "#e84040", fontWeight: 700 }}>{fps}</span>
        </div>

        {/* Scroll progress */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
          <span style={{ color: "rgba(255,249,238,0.45)" }}>Scroll</span>
          <span style={{ color: "#e8b943", fontWeight: 700 }}>{(progress * 100).toFixed(1)}%</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: "3px", background: "rgba(255,249,238,0.08)", borderRadius: "2px", marginBottom: "0.75rem", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: "var(--clay, #ba5b38)", borderRadius: "2px", transition: "width 0.1s" }} />
        </div>

        {/* Active section */}
        <div style={{ borderTop: "1px solid rgba(255,249,238,0.08)", paddingTop: "0.6rem", marginBottom: "0.4rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ color: "rgba(255,249,238,0.45)" }}>Section</span>
            <span style={{ color: "#fff9ee", fontWeight: 600 }}>{navLabels[activeSection.id] ?? activeSection.id}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ color: "rgba(255,249,238,0.45)" }}>Band progress</span>
            <span style={{ color: "#fff9ee" }}>{Math.max(0, Math.min(100, bandProgress)).toFixed(1)}%</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ color: "rgba(255,249,238,0.45)" }}>Origin</span>
            <span style={{ color: "#6ec1e4" }}>{activeSection.origin}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
            <span style={{ color: "rgba(255,249,238,0.45)" }}>Peak scale</span>
            <span style={{ color: "#a78bfa" }}>{activeSection.peakScale}</span>
          </div>
        </div>

        {/* All sections mini-list */}
        <div style={{ borderTop: "1px solid rgba(255,249,238,0.08)", paddingTop: "0.6rem" }}>
          {config.map((c, i) => {
            const { start: s, end: e } = bands[i];
            const p = e > s ? Math.max(0, Math.min(1, (progress - s) / (e - s))) : 0;
            const isActive = i === activeSectionIdx;
            return (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: isActive ? "#ba5b38" : "rgba(255,249,238,0.15)", flexShrink: 0 }} />
                <span style={{ flex: 1, color: isActive ? "#fff9ee" : "rgba(255,249,238,0.35)", fontSize: "11px" }}>
                  {navLabels[c.id] ?? c.id}
                </span>
                <div style={{ width: "50px", height: "2px", background: "rgba(255,249,238,0.08)", borderRadius: "1px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${p * 100}%`, background: isActive ? "#ba5b38" : "rgba(255,249,238,0.2)" }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: "0.6rem", color: "rgba(255,249,238,0.2)", fontSize: "10px", textAlign: "center" }}>
          Konami activated · scroll to see live data
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── KONAMI EFFECT 3 — GOOGLY EYES ───────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
type GooglyEye = { x: number; y: number; size: number; id: number; born: number };

function GooglyEyesOverlay({ onClose }: { onClose: () => void }) {
  const [eyes, setEyes]       = useState<GooglyEye[]>([]);
  const [mouse, setMouse]     = useState({ x: -9999, y: -9999 });
  const [clearing, setClearing] = useState(false);
  const idRef                 = useRef(0);

  const MAX_EYES   = 250; 
  const SPAWN_MS   = 3000; // total spawn window
  const LINGER_MS  = 600;  // how long full screen holds before clearing

  // Spawn eye pairs over SPAWN_MS, then clear
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < MAX_EYES; i++) {
      const delay = (SPAWN_MS / MAX_EYES) * i + Math.random() * (SPAWN_MS / MAX_EYES) * 0.6;
      timers.push(setTimeout(() => {
        const size = 12 + Math.random() * 38; // Slightly smaller base radius (12–50px) to accommodate pairs
        const xMargin = size * 2.2; // Extra padding so the pair doesn't overflow the screen edge
        const yMargin = size * 1.2;

        setEyes(prev => [
          ...prev,
          {
            x: xMargin + Math.random() * (window.innerWidth  - xMargin * 2),
            y: yMargin + Math.random() * (window.innerHeight - yMargin * 2),
            size,
            id: idRef.current++,
            born: Date.now(),
          },
        ]);
      }, delay));
    }

    // After all eyes are up, linger then clear
    timers.push(setTimeout(() => {
      setClearing(true);
      setTimeout(onClose, 500);
    }, SPAWN_MS + LINGER_MS));

    return () => timers.forEach(clearTimeout);
  }, [onClose]);

  // Track mouse
  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9990, pointerEvents: "none" }}>
      <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible" }}>
        {eyes.map((pair) => {
          const r = pair.size;
          const pr = r * 0.38;
          
          const age = (Date.now() - pair.born) / 120; // for pop-in
          const scale = clearing ? 0 : Math.min(1, age);

          // We space the eyes slightly overlapping (0.95 * r) for a classic comic look
          const leftEyeOffset = -r * 0.95;
          const rightEyeOffset = r * 0.95;

          // --- Left Eye Mouse Tracking ---
          const lx = pair.x + leftEyeOffset;
          const ly = pair.y;
          const lDx = mouse.x - lx;
          const lDy = mouse.y - ly;
          const lDist = Math.sqrt(lDx * lDx + lDy * lDy);
          const lMax = r * 0.42;
          const lPx = lDist > 0 ? (lDx / lDist) * Math.min(lDist * 0.35, lMax) : 0;
          const lPy = lDist > 0 ? (lDy / lDist) * Math.min(lDist * 0.35, lMax) : 0;

          // --- Right Eye Mouse Tracking ---
          const rx = pair.x + rightEyeOffset;
          const ry = pair.y;
          const rDx = mouse.x - rx;
          const rDy = mouse.y - ry;
          const rDist = Math.sqrt(rDx * rDx + rDy * rDy);
          const rMax = r * 0.42;
          const rPx = rDist > 0 ? (rDx / rDist) * Math.min(rDist * 0.35, rMax) : 0;
          const rPy = rDist > 0 ? (rDy / rDist) * Math.min(rDist * 0.35, rMax) : 0;

          const eyeColor = `hsl(${(pair.id * 47) % 360},60%,40%)`;

          return (
            <g
              key={pair.id}
              transform={`translate(${pair.x}, ${pair.y}) scale(${scale.toFixed(3)})`}
              style={{ transition: clearing ? "transform 0.4s cubic-bezier(0.4,0,0.2,1)" : "transform 0.15s cubic-bezier(0.25,1,0.5,1)" }}
            >
              {/* LEFT EYE */}
              <g transform={`translate(${leftEyeOffset}, 0)`}>
                {/* Eyeball */}
                <circle r={r} fill="white" stroke="rgba(0,0,0,0.18)" strokeWidth={r * 0.07} />
                {/* Blood-vessel tint for big eyes */}
                {r > 40 && <circle r={r * 0.92} fill="rgba(255,220,220,0.18)" />}
                {/* Iris */}
                <circle cx={lPx} cy={lPy} r={pr * 1.15} fill={eyeColor} />
                {/* Pupil */}
                <circle cx={lPx} cy={lPy} r={pr} fill="#0a0a0a" />
                {/* Shine */}
                <circle cx={lPx + pr * 0.32} cy={lPy - pr * 0.32} r={pr * 0.32} fill="white" opacity={0.92} />
                <circle cx={lPx - pr * 0.18} cy={lPy + pr * 0.22} r={pr * 0.14} fill="white" opacity={0.5} />
              </g>

              {/* RIGHT EYE */}
              <g transform={`translate(${rightEyeOffset}, 0)`}>
                {/* Eyeball */}
                <circle r={r} fill="white" stroke="rgba(0,0,0,0.18)" strokeWidth={r * 0.07} />
                {/* Blood-vessel tint for big eyes */}
                {r > 40 && <circle r={r * 0.92} fill="rgba(255,220,220,0.18)" />}
                {/* Iris */}
                <circle cx={rPx} cy={rPy} r={pr * 1.15} fill={eyeColor} />
                {/* Pupil */}
                <circle cx={rPx} cy={rPy} r={pr} fill="#0a0a0a" />
                {/* Shine */}
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

// ═══════════════════════════════════════════════════════════════════════════════
// ─── KONAMI WRAPPER ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
type KonamiEffect = "fireworks" | "devhud" | "googly";

function KonamiTrigger({
  effect,
  progress,
  config,
  onDone,
}: {
  effect: KonamiEffect;
  progress: number;
  config: SectionCfg[];
  onDone: () => void;
}) {
  if (effect === "fireworks") return <FireworksOverlay onDone={onDone} />;
  if (effect === "devhud")    return <DevModeHUD progress={progress} config={config} onClose={onDone} />;
  if (effect === "googly")    return <GooglyEyesOverlay onClose={onDone} />;
  return null;
}

// ─── IDLE NOTIFICATION ────────────────────────────────────────────────────────
function IdleNotification({ onClose, onContact }: { onClose: () => void; onContact: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);
  const handleClose   = () => { setVisible(false); setTimeout(onClose, 350); };
  const handleContact = () => { setVisible(false); setTimeout(() => { onClose(); onContact(); }, 350); };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:8000,display:"flex",alignItems:"flex-end",justifyContent:"flex-end",padding:"2rem",pointerEvents:"none" }}>
      <div style={{ position:"fixed",inset:0,background:"rgba(10,16,12,0.35)",backdropFilter:"blur(6px)",WebkitBackdropFilter:"blur(6px)",opacity:visible?1:0,transition:"opacity 0.35s ease",pointerEvents:visible?"auto":"none" }} onClick={handleClose} />
      <div style={{ position:"relative",width:"320px",background:"rgba(17,25,22,0.97)",border:"1px solid rgba(255,249,238,0.15)",borderRadius:"20px",boxShadow:"0 24px 60px rgba(0,0,0,0.6),0 0 40px rgba(186,91,56,0.1)",padding:"1.5rem",transform:visible?"translateY(0) scale(1)":"translateY(30px) scale(0.95)",opacity:visible?1:0,transition:"transform 0.35s cubic-bezier(0.25,1,0.5,1),opacity 0.35s ease",pointerEvents:"auto" }}>
        <button onClick={handleClose} style={{ position:"absolute",top:"0.9rem",right:"0.9rem",background:"rgba(255,249,238,0.06)",border:"1px solid rgba(255,249,238,0.12)",color:"rgba(255,249,238,0.6)",borderRadius:"50%",width:"28px",height:"28px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",lineHeight:1,transition:"background 0.2s,color 0.2s" }} onMouseEnter={e=>{e.currentTarget.style.background="rgba(186,91,56,0.25)";e.currentTarget.style.color="#fff9ee"}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,249,238,0.06)";e.currentTarget.style.color="rgba(255,249,238,0.6)"}}>&times;</button>
        <div style={{ display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"0.75rem" }}>
          <div style={{ width:"38px",height:"38px",borderRadius:"50%",background:"rgba(186,91,56,0.15)",border:"1px solid rgba(186,91,56,0.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0 }}>
            <picture>
              <source srcSet="https://fonts.gstatic.com/s/e/notoemoji/latest/1f409/512.webp" type="image/webp" />
              <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f409/512.gif" alt="🐉" width="32" height="32" style={{ display: "block" }} />
            </picture>
          </div>
          <div>
            <p style={{ margin:0,fontSize:"0.7rem",letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--clay,#ba5b38)",fontFamily:"'Space Grotesk',sans-serif",fontWeight:600 }}>Still here?</p>
            <h3 style={{ margin:0,fontSize:"1rem",fontWeight:700,color:"#fff9ee",fontFamily:"'Space Grotesk',sans-serif" }}>still reading? just ping me lol</h3>
          </div>
        </div>
        <p style={{ margin:"0 0 1.1rem",fontSize:"0.875rem",color:"rgba(255,249,238,0.55)",lineHeight:1.5,fontFamily:"'Space Grotesk',sans-serif" }}>You&apos;ve been here a while - If you like my work, you can just slide in my dm.</p>
        <button onClick={handleContact} style={{ width:"100%",padding:"0.65rem 1rem",background:"var(--clay,#ba5b38)",border:"none",borderRadius:"10px",color:"#fff9ee",fontWeight:700,fontSize:"0.875rem",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.02em",transition:"background 0.2s,transform 0.15s" }} onMouseEnter={e=>{e.currentTarget.style.background="#993c1d";e.currentTarget.style.transform="scale(1.02)"}} onMouseLeave={e=>{e.currentTarget.style.background="var(--clay,#ba5b38)";e.currentTarget.style.transform="scale(1)"}}>Take me to Contact →</button>
      </div>
    </div>
  );
}

// ─── EXPERIENCE POPUP ─────────────────────────────────────────────────────────
function ExperiencePopup({ expId, onClose }: { expId: string; onClose: () => void }) {
  const data = EXPERIENCE_DETAILS[expId];
  if (!data) return null;
  const cardRef = useRef<HTMLDivElement>(null);
  const [transformStyle, setTransformStyle] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)");
  const [expandedIndex, setExpandedIndex]   = useState<number>(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const rx = ((e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)) * -11;
    const ry = ((e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)) *  11;
    setTransformStyle(`perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(1.02)`);
  };

  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(17,25,22,0.42)",backdropFilter:"blur(14px)",padding:"1rem" }} onClick={onClose}>
      <div ref={cardRef} onMouseMove={handleMouseMove} onMouseLeave={() => setTransformStyle("perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)")} onClick={e=>e.stopPropagation()} style={{ position:"relative",width:"420px",maxWidth:"100%",background:"var(--night)",border:"1px solid rgba(255,249,238,0.15)",borderRadius:"20px",boxShadow:"var(--shadow),0 0 45px rgba(186,91,56,0.12)",overflow:"hidden",transition:"transform 150ms cubic-bezier(0.25,1,0.5,1)",transform:transformStyle,transformStyle:"preserve-3d" }}>
        <div style={{ position:"relative",height:"140px",width:"100%",overflow:"hidden" }}>
          <img src={data.imageSrc} alt={data.company} style={{ width:"100%",height:"100%",objectFit:"cover",opacity:0.4 }} />
          <div style={{ position:"absolute",bottom:"1rem",left:"1.5rem",right:"1.5rem",transform:"translateZ(30px)" }}>
            <h2 style={{ fontFamily:"var(--font-display),Georgia,serif",fontSize:"2.6rem",color:"#fff9ee",margin:0,textShadow:"0 2px 8px rgba(0,0,0,0.8)" }}>{data.company}</h2>
          </div>
          <button onClick={onClose} style={{ position:"absolute",top:"1rem",right:"1rem",background:"rgba(17,25,22,0.65)",border:"1px solid rgba(255,249,238,0.2)",color:"#fff9ee",borderRadius:"50%",width:"30px",height:"30px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",lineHeight:1,zIndex:10,transition:"background 0.2s" }} onMouseEnter={e=>(e.currentTarget.style.background="var(--clay)")} onMouseLeave={e=>(e.currentTarget.style.background="rgba(17,25,22,0.65)")}>&times;</button>
        </div>
        <div style={{ padding:"1.5rem",transform:"translateZ(20px)",maxHeight:"350px",overflowY:"auto" }} className="card-content-scroll">
          <div style={{ display:"flex",flexDirection:"column",gap:"1rem" }}>
            {data.roles.map((role, idx) => {
              const isExpanded = expandedIndex === idx;
              const hasMultiple = data.roles.length > 1;
              return (
                <div key={idx} style={{ background:"rgba(255,249,238,0.04)",border:isExpanded?"1px solid rgba(186,91,56,0.4)":"1px solid rgba(255,249,238,0.08)",borderRadius:"12px",overflow:"hidden",transition:"all 0.3s ease" }}>
                  <button onClick={()=>{ if(hasMultiple) setExpandedIndex(isExpanded?-1:idx); }} style={{ width:"100%",background:"none",border:"none",padding:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:hasMultiple?"pointer":"default",textAlign:"left",outline:"none" }}>
                    <div>
                      <h4 style={{ margin:0,fontSize:"1.25rem",fontWeight:700,color:isExpanded?"var(--clay)":"#fff9ee",transition:"color 0.2s",fontFamily:"var(--font-sans),sans-serif" }}>{role.title}</h4>
                      <span style={{ fontSize:"0.95rem",color:"var(--muted)",marginTop:"2px",display:"inline-block" }}>{role.period}</span>
                    </div>
                    {hasMultiple && <span style={{ fontSize:"1rem",color:"var(--clay)",transform:isExpanded?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.2s" }}>▼</span>}
                  </button>
                  <div style={{ maxHeight:isExpanded?"300px":"0px",opacity:isExpanded?1:0,overflow:"hidden",transition:"max-height 0.35s cubic-bezier(0.25,1,0.5,1),opacity 0.3s ease" }}>
                    <div style={{ padding:"0 1rem 1rem 1rem",borderTop:"1px solid rgba(255,249,238,0.05)",paddingTop:"0.75rem" }}>
                      <ul style={{ margin:0,paddingLeft:"1.2rem",color:"rgba(255,249,238,0.75)",fontSize:"1.05rem",lineHeight:"1.5",display:"flex",flexDirection:"column",gap:"0.5rem" }}>
                        {role.bullets.map((b,bi)=><li key={bi}>{b}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html:`.card-content-scroll::-webkit-scrollbar{width:4px}.card-content-scroll::-webkit-scrollbar-track{background:transparent}.card-content-scroll::-webkit-scrollbar-thumb{background:rgba(186,91,56,0.25);border-radius:4px}.card-content-scroll::-webkit-scrollbar-thumb:hover{background:var(--clay)}`}} />
      </div>
    </div>
  );
}

// ─── DOCK ─────────────────────────────────────────────────────────────────────
export type DockItemData = { icon: React.ReactNode; label: string; onClick: () => void };

function Dock({ items }: { items: DockItemData[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  return (
    <div className="dock-outer">
      <div className="dock-panel">
        {items.map((item, index) => {
          let scale = 1;
          if (hoveredIndex !== null) {
            const d = Math.abs(index - hoveredIndex);
            if (d === 0) scale = 1.35; else if (d === 1) scale = 1.12;
          }
          return (
            <button key={index} onClick={item.onClick} onMouseEnter={()=>setHoveredIndex(index)} onMouseLeave={()=>setHoveredIndex(null)} className="dock-item" style={{ width:"50px",height:"50px",transform:`scale(${scale})`,transition:"transform 180ms cubic-bezier(0.2,0.8,0.2,1),background-color 0.2s",position:"relative" }}>
              <div className="dock-icon">{item.icon}</div>
              {hoveredIndex === index && <div className="dock-label">{item.label}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── SCROLL MATH ──────────────────────────────────────────────────────────────
function computeBands(config: SectionCfg[]) {
  const total = config.reduce((a, c) => a + c.scrolls, 0);
  let cursor = 0;
  return config.map((c) => {
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

function getSectionStyle(index: number, progress: number, config: SectionCfg[]): React.CSSProperties {
  const bands = computeBands(config);
  const { start, end } = bands[index];
  const { peakAt, origin, align, peakScale } = config[index];
  const peak     = start + (end - start) * peakAt;
  const halfBand = (end - start) * 0.5;
  const norm     = (progress - peak) / halfBand;
  let scale = 1, opacity = 1, blur = 0, tx = 0, ty = 0;
  const plateauStart = -0.15, plateauEnd = 0.15;

  if (norm < -1.2) {
    scale = 0.04; opacity = 0; blur = 0;
    if (origin==="left") tx=-350; if (origin==="right") tx=350;
    if (origin==="top")  ty=-350; if (origin==="bottom") ty=350;
  } else if (norm < plateauStart) {
    const t = (norm + 1.2) / (1.2 + plateauStart);
    scale   = 0.04 + (peakScale - 0.04) * (t * t);
    opacity = Math.min(1, t * 1.8); blur = (1 - t) * 2;
    const factor = (norm - plateauStart) / (-1.2 - plateauStart);
    const distance = factor * 350;
    if (origin==="left") tx=-distance; if (origin==="right") tx=distance;
    if (origin==="top")  ty=-distance; if (origin==="bottom") ty=distance;
  } else if (norm <= plateauEnd) {
    scale = peakScale; opacity = 1; blur = 0; tx = 0; ty = 0;
  } else if (norm < 1.0) {
    const t = (norm - plateauEnd) / (1.0 - plateauEnd);
    scale   = peakScale + t * (6 - peakScale);
    opacity = Math.max(0, 1 - t * t); blur = t * 5;
    const factor = (norm - plateauEnd) / (1.0 - plateauEnd);
    const distance = factor * 500;
    if (origin==="left") tx=distance; if (origin==="right") tx=-distance;
    if (origin==="top")  ty=distance; if (origin==="bottom") ty=-distance;
  } else {
    scale = 6; opacity = 0; blur = 5;
    if (origin==="left") tx=500; if (origin==="right") tx=-500;
    if (origin==="top")  ty=500; if (origin==="bottom") ty=-500;
  }

  opacity = Math.max(0, Math.min(1, opacity));
  return {
    position: "fixed", inset: 0, willChange: "transform,opacity,filter",
    transform: `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${scale.toFixed(4)})`,
    transformOrigin: getTransformOrigin(align || "center"),
    opacity, filter: blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : "none",
    zIndex: Math.round((1 - Math.abs(norm)) * 10),
    perspective: origin === "radial" ? "800px" : undefined,
  };
}

// ─── DEV PANEL ────────────────────────────────────────────────────────────────
function DevPanel({ config, onChange, onReset, onResetIndividual }: { config: SectionCfg[]; onChange: (i:number,k:string,v:number|string)=>void; onReset:()=>void; onResetIndividual:(i:number)=>void }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ position:"fixed",bottom:0,right:0,width:280,maxHeight:"85vh",background:"rgba(10,16,12,0.97)",backdropFilter:"blur(12px)",color:"#fff9ee",fontFamily:"'Space Grotesk',monospace",fontSize:11,zIndex:9999,borderRadius:"14px 0 0 0",border:"1px solid rgba(255,249,238,0.1)",borderRight:"none",borderBottom:"none",boxShadow:"0 -8px 40px rgba(0,0,0,0.4)",display:"flex",flexDirection:"column" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderBottom:"1px solid rgba(255,249,238,0.1)",cursor:"pointer",userSelect:"none" }} onClick={()=>setOpen(v=>!v)}>
        <span style={{ fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",fontSize:10,color:"#ba5b38" }}>⚙ Scroll Config</span>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={e=>{e.stopPropagation();onReset()}} style={{ background:"rgba(186,91,56,0.2)",border:"1px solid rgba(186,91,56,0.4)",color:"#ba5b38",borderRadius:4,padding:"2px 8px",cursor:"pointer",fontSize:10 }}>reset all</button>
          <span style={{ opacity:0.5,fontSize:13,lineHeight:1 }}>{open?"▼":"▲"}</span>
        </div>
      </div>
      {open && (
        <div style={{ overflowY:"auto",padding:"8px 12px 12px" }}>
          {config.map((c,i)=>(
            <div key={c.id} style={{ borderBottom:"1px solid rgba(255,249,238,0.08)",paddingBottom:10,marginBottom:10 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                <div style={{ fontWeight:700,color:"#ba5b38",letterSpacing:"0.08em",textTransform:"uppercase",fontSize:10 }}>{navLabels[c.id]??c.id}</div>
                <button onClick={()=>onResetIndividual(i)} style={{ background:"transparent",border:"1px solid rgba(255,249,238,0.2)",color:"rgba(255,249,238,0.5)",borderRadius:4,padding:"2px 6px",cursor:"pointer",fontSize:9 }}>reset</button>
              </div>
              {[["scale","peakScale",0.3,1.5,0.01],["peak at","peakAt",0.1,0.9,0.05],["scrolls","scrolls",50,300,10]].map(([label,key,min,max,step])=>(
                <div key={String(key)} style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
                  <span style={{ width:44,color:"rgba(255,249,238,0.45)",flexShrink:0 }}>{label}</span>
                  <input type="range" min={Number(min)} max={Number(max)} step={Number(step)} value={c[key as keyof SectionCfg] as number} onChange={e=>onChange(i,String(key),+e.target.value)} style={{ flex:1,accentColor:"#ba5b38" }} />
                  <span style={{ width:34,textAlign:"right",color:"rgba(255,249,238,0.7)",flexShrink:0 }}>{key==="peakAt"?Math.round((c[key as keyof SectionCfg] as number)*100)+"%":String(c[key as keyof SectionCfg])}</span>
                </div>
              ))}
              {[["from","origin",ORIGINS],["align","align",ALIGNS]].map(([label,key,opts])=>(
                <div key={String(key)} style={{ display:"flex",alignItems:"center",gap:6,marginTop:4 }}>
                  <span style={{ width:44,color:"rgba(255,249,238,0.45)",flexShrink:0 }}>{label}</span>
                  <div style={{ display:"flex",gap:3,flexWrap:"wrap" }}>
                    {(opts as string[]).map(o=><button key={o} onClick={()=>onChange(i,String(key),o)} style={{ padding:"2px 6px",fontSize:10,borderRadius:4,border:"1px solid",cursor:"pointer",background:c[key as keyof SectionCfg]===o?"#ba5b38":"transparent",borderColor:c[key as keyof SectionCfg]===o?"#ba5b38":"rgba(255,249,238,0.2)",color:c[key as keyof SectionCfg]===o?"#fff9ee":"rgba(255,249,238,0.5)" }}>{o}</button>)}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <button onClick={()=>{navigator.clipboard.writeText(`const DEFAULT_CONFIG = ${JSON.stringify(config,null,2)};`).then(()=>alert("Config copied!"))}} style={{ width:"100%",padding:"7px",marginTop:4,background:"rgba(186,91,56,0.15)",border:"1px solid rgba(186,91,56,0.35)",color:"#ba5b38",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:700 }}>📋 Copy config to clipboard</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const [config, setConfig]       = useState<SectionCfg[]>(DEFAULT_CONFIG.map(c=>({...c})));
  const [progress, setProgress]   = useState(0);
  const [activeExp, setActiveExp] = useState<string | null>(null);
  const rafRef                    = useRef<number | null>(null);

  // Easter egg state
  const [showIdleNotif, setShowIdleNotif]   = useState(false);
  const [ctxMenu, setCtxMenu]               = useState<{x:number;y:number}|null>(null);
  const [konamiEffect, setKonamiEffect]     = useState<KonamiEffect | null>(null);
  const konamiRef                           = useRef<string[]>([]);
  const KONAMI_SEQ = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  const EFFECTS: KonamiEffect[]             = ["fireworks","devhud","googly"];

  // Contact form state
  const [formName, setFormName]         = useState("");
  const [formEmail, setFormEmail]       = useState("");
  const [formMessage, setFormMessage]   = useState("");
  const [formStatus, setFormStatus]     = useState<"idle"|"sending"|"sent"|"error">("idle");
  const [formError, setFormError]       = useState("");

  const totalVh = config.reduce((a,c) => a + c.scrolls, 0);

  // Scroll progress
  useEffect(() => {
    const onScroll = () => {
      setActiveExp(null);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (window.scrollY > max) { window.scrollTo({ top: max, behavior: "instant" as ScrollBehavior }); return; }
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        const cm = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(cm > 0 ? Math.min(window.scrollY / cm, 1) : 0);
        rafRef.current = null;
      });
    };
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.documentElement.style.overscrollBehavior = "";
      document.body.style.overscrollBehavior = "";
    };
  }, []);

  // Idle notification
  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout>;
    let shown = false;
    const reset = () => {
      clearTimeout(idleTimer);
      if (shown) return;
      idleTimer = setTimeout(() => { if (!shown) { shown = true; setShowIdleNotif(true); } }, 30_000);
    };
    const events = ["scroll","mousemove","keydown","touchstart"] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(idleTimer); events.forEach(e => window.removeEventListener(e, reset)); };
  }, []);

  // Right-click context menu
  useEffect(() => {
    if (ENABLE_DEV_TOOLS) return;
    const onCtx = (e: MouseEvent) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); };
    const onClose = () => setCtxMenu(null);
    window.addEventListener("contextmenu", onCtx);
    window.addEventListener("click", onClose);
    window.addEventListener("scroll", onClose, { passive: true });
    return () => { window.removeEventListener("contextmenu", onCtx); window.removeEventListener("click", onClose); window.removeEventListener("scroll", onClose); };
  }, []);

  // Konami code — picks a random effect each time
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      konamiRef.current = [...konamiRef.current, e.key].slice(-10);
      if (konamiRef.current.join(",") === KONAMI_SEQ.join(",")) {
        const pick = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
        setKonamiEffect(pick);
        konamiRef.current = [];
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleChange = (i: number, key: string, val: number | string) =>
    setConfig(prev => prev.map((c,idx) => idx===i ? {...c,[key]:val} : c));
  const handleReset = () => setConfig(DEFAULT_CONFIG.map(c=>({...c})));
  const handleResetIndividual = (i: number) =>
    setConfig(prev => prev.map((c,idx) => idx===i ? {...DEFAULT_CONFIG[i]} : c));

  const navTo = useCallback((id: string) => {
    const idx = config.findIndex(c => c.id === id);
    if (idx < 0) return;
    const total = config.reduce((a,c) => a + c.scrolls, 0);
    let cursor = 0;
    for (let i = 0; i < idx; i++) cursor += config[i].scrolls;
    const peakOffset = cursor + config[idx].scrolls * config[idx].peakAt;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo({ top: (peakOffset / total) * max, behavior: "smooth" });
  }, [config]);

  // Contact form submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!formName.trim() || !formEmail.trim() || !formMessage.trim()) {
      setFormError("Please fill in all fields."); return;
    }
    setFormStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail, message: formMessage }),
      });
      if (res.ok) {
        setFormStatus("sent");
        setFormName(""); setFormEmail(""); setFormMessage("");
      } else {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error ?? "Something went wrong. Please try again.");
        setFormStatus("error");
      }
    } catch {
      setFormError("Network error. Please try again.");
      setFormStatus("error");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.65rem 0.9rem",
    background: "rgba(255,249,238,0.05)", border: "1px solid rgba(255,249,238,0.15)",
    borderRadius: "10px", color: "#fff9ee", fontSize: "0.875rem",
    fontFamily: "'Space Grotesk',sans-serif", outline: "none", boxSizing: "border-box",
  };

  const socialItems = [
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:"#fff9ee"}}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>, label: "GitHub",    onClick: () => window.open("https://github.com/prajwalgowdavee","_blank") },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:"#fff9ee"}}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>, label: "LinkedIn",  onClick: () => window.open("https://www.linkedin.com/in/ds-prajwal-gowda/","_blank") },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:"#fff9ee"}}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>, label: "@prajwal.btc", onClick: () => window.open("https://www.instagram.com/prajwal.btc/","_blank") },
  ];

  return (
    <main style={{ height: `${totalVh}vh`, position: "relative", overflow: "hidden" }}>
      {/* ── Shared styles ── */}
      <style dangerouslySetInnerHTML={{__html:`
        .map-scroll-container::-webkit-scrollbar{height:6px}
        .map-scroll-container::-webkit-scrollbar-track{background:rgba(255,255,255,0.03);border-radius:4px}
        .map-scroll-container::-webkit-scrollbar-thumb{background:rgba(232,185,67,0.2);border-radius:4px}
        .dsj_nav{position:relative;width:100%;min-width:950px;height:280px;background-image:url('/images/map_curr.png');background-size:contain;background-position:center;background-repeat:no-repeat;margin:1.5rem auto}
        .dsj_nav .item{position:absolute;display:flex;flex-direction:column;align-items:center;text-decoration:none;transform:translate(-50%,-50%);transition:all 0.3s cubic-bezier(0.25,1,0.5,1)}
        .dsj_nav .item1{left:20.5%;top:29.5%}
        .dsj_nav .item2{left:37.5%;top:68.5%}
        .dsj_nav .item.lock{left:50.5%;top:54%;cursor:default}
        .dsj_nav .dot{background:url(/images/map_button.png) 50% no-repeat;background-size:contain;height:43px;width:57px;margin:0 auto;transition:all 0.3s}
        .dsj_nav .item.on .dot,.dsj_nav .item:hover .dot{background:url(/images/map_button_pulse.png) 50% no-repeat;background-size:contain;transform:scale(1.1)}
        .dsj_nav .item.on .dot{animation:mapDotGlow 1.5s infinite alternate ease-in-out}
        @keyframes mapDotGlow{from{filter:drop-shadow(0 0 3px rgba(232,185,67,0.4))}to{filter:drop-shadow(0 0 14px rgba(232,185,67,0.9))}}
        .dsj_nav .item.lock .dot{filter:grayscale(100%) opacity(0.5)}
        .dsj_nav .txt{color:#f5cc7f;font-family:'Space Grotesk',sans-serif;font-size:13.5px;font-weight:600;letter-spacing:0.05em;white-space:nowrap;display:flex;align-items:center;justify-content:center;text-shadow:0 2px 4px rgba(252,223,144,0.8);transition:color 0.25s ease;margin-bottom:1px}
        .dsj_nav .item:hover .txt{color:#e8b943}
        .dsj_nav .item.lock .txt{color:rgba(0,0,0,0.45)}
        .dsj_nav .txt i{display:inline-block;width:14px;height:14px;background-size:contain;background-repeat:no-repeat;background-position:center;vertical-align:middle;margin-right:4px}
        .dsj_nav .item.lock .txt i{background-image:url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888888"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>')}
        .dock-outer{margin:2rem auto 0;display:flex;width:100%;align-items:center;justify-content:center;position:relative}
        .dock-panel{display:flex;align-items:center;justify-content:center;width:fit-content;gap:0.85rem;border-radius:1.25rem;background-color:rgba(10,16,12,0.95);border:1px solid rgba(255,249,238,0.15);padding:0.5rem 0.75rem;box-shadow:0 10px 30px rgba(0,0,0,0.5);height:68px}
        .dock-item{position:relative;display:inline-flex;align-items:center;justify-content:center;border-radius:12px;background-color:rgba(255,249,238,0.05);border:1px solid rgba(255,249,238,0.1);box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06);cursor:pointer;outline:none;padding:0}
        .dock-item:hover{background-color:rgba(255,249,238,0.1);border-color:var(--clay)}
        .dock-icon{display:flex;align-items:center;justify-content:center}
        .dock-label{position:absolute;top:-2.4rem;left:50%;width:fit-content;white-space:pre;border-radius:0.375rem;border:1px solid rgba(255,249,238,0.15);background-color:rgba(10,16,12,0.98);padding:0.25rem 0.5rem;font-size:0.75rem;color:#fff9ee;transform:translateX(-50%);pointer-events:none;font-family:'Space Grotesk',sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.4);animation:dockLabelFadeIn 0.15s ease-out forwards}
        @keyframes dockLabelFadeIn{from{opacity:0;transform:translate(-50%,4px)}to{opacity:1;transform:translate(-50%,0)}}
        .contact-form-input:focus{border-color:rgba(186,91,56,0.5)!important;box-shadow:0 0 0 3px rgba(186,91,56,0.1)}
      `}} />

      {/* ── Side nav ── */}
      <aside className="side-nav" aria-label="Section navigation">
        {config.map(item => (
          <a key={item.id} className="nav-diamond" href={`#${item.id}`} onClick={e=>{e.preventDefault();navTo(item.id)}}>
            <span>{navLabels[item.id]??item.id}</span>
          </a>
        ))}
      </aside>

      {/* ── Hero ── */}
      <section className="hero section-shell" id="hero" style={getSectionStyle(0,progress,config)}>
        <div className="hero-copy">
          <p className="eyebrow">Portfolio / AI systems / Useful intelligence</p>
          <h1 className="hero-name">Prajwal Gowda D S</h1>
          <p className="title-pill">AI Engineer</p>
          <p className="hero-tagline">I build AI that feels less like a black box and more like a sharp teammate.</p>
        </div>
      </section>

      {/* ── About ── */}
      <section className="section-shell split" id="about" style={getSectionStyle(1,progress,config)}>
        <div>
          <p className="eyebrow">About Me</p>
          <h2>Curious builder, practical dreamer.</h2>
          <p>I like working where ideas become tools. My path into AI has been shaped by a simple obsession: take complex systems, make them understandable, and turn them into something people can actually use.</p>
          <p>I&apos;m especially drawn to LLM products, data-rich workflows, and the craft of making intelligent software feel calm, reliable, and human.</p>
        </div>
        <div className="photo-placeholder"><span>Photo</span><small>Add your portrait here</small></div>
      </section>

      {/* ── Skills ── */}
      <section className="section-shell" id="skills" style={getSectionStyle(2,progress,config)}>
        <p className="eyebrow">Skills</p>
        <h2>Technical stack with teeth.</h2>
        <div className="skill-grid">
          {skills.map(skill => <div className="skill-card" key={skill}>{skill}</div>)}
        </div>
      </section>

      {/* ── Projects ── */}
      <section className="section-shell" id="projects" style={getSectionStyle(3,progress,config)}>
        <p className="eyebrow">Projects / Work</p>
        <h2>Selected AI builds.</h2>
        <div className="project-grid">
          {projects.map(project => (
            <article className="project-card" key={project.title}>
              <p>{project.stack}</p>
              <h3>{project.title}</h3>
              <span>{project.description}</span>
              <a href={project.href} onClick={e=>{e.preventDefault();navTo(project.href.replace("#",""))}}>Open case study</a>
            </article>
          ))}
        </div>
      </section>

      {/* ── Experience ── */}
      <section className="section-shell" id="experience" style={getSectionStyle(4,progress,config)}>
        <p className="eyebrow">Career / Experience</p>
        <h2>Map of the journey.</h2>
        <p>Click to view details.</p>
        <div className="map-scroll-container" style={{ position:"relative",width:"100%",overflowX:"auto",overflowY:"hidden",borderRadius:"16px",marginTop:"2.5rem",padding:"1rem 0" }}>
          <div className="dsj_nav" data-nav="1">
            <button onClick={()=>setActiveExp("tata")} className="item item1" style={{ background:"none",border:"none",padding:0,cursor:"pointer",outline:"none",fontFamily:"inherit" }}>
              <div className="txt">Tata Steel</div><div className="dot"></div>
            </button>
            <button onClick={()=>setActiveExp("tejas")} className="item item2 on" style={{ background:"none",border:"none",padding:0,cursor:"pointer",outline:"none",fontFamily:"inherit" }}>
              <div className="dot"></div><div className="txt">Tejas Networks</div>
            </button>
            <div className="item lock">
              <div className="txt"><i></i>Stay tuned!</div><div className="dot"></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Resume ── */}
      <section className="section-shell resume-band" id="resume" style={getSectionStyle(5,progress,config)}>
        <div>
          <p className="eyebrow">Resume / CV</p>
          <h2>Need the concise version?</h2>
          <p>Click this button and it will download it directly.</p>
        </div>
        <a className="button primary" href="/resume.pdf" download>Download Resume</a>
      </section>

      {/* ── Contact ── */}
      <section className="section-shell contact" id="contact" style={getSectionStyle(6,progress,config)}>
        <p className="eyebrow" style={{ marginBottom:"0.25rem" }}>Contact</p>
        <h2 style={{ marginTop:"0px",marginBottom:"0.75rem" }}>Let&apos;s build something intelligent.</h2>

        <div className="contact-panel" style={{ marginTop:"0px",marginBottom:"0.75rem" }}>
          {formStatus === "sent" ? (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"0.75rem",padding:"2rem",textAlign:"center",background:"rgba(126,200,160,0.06)",border:"1px solid rgba(126,200,160,0.2)",borderRadius:"16px" }}>
              <div style={{ fontSize:"2.5rem" }}>✅</div>
              <h3 style={{ margin:0,color:"#7ec8a0",fontFamily:"var(--font-display),Georgia,serif" }}>Message sent!</h3>
              <p style={{ margin:0,color:"rgba(255,249,238,0.55)",fontSize:"0.9rem" }}>I&apos;ll get back to you soon.</p>
              <button onClick={()=>setFormStatus("idle")} style={{ marginTop:"0.5rem",padding:"0.5rem 1.2rem",background:"rgba(255,249,238,0.06)",border:"1px solid rgba(255,249,238,0.15)",borderRadius:"8px",color:"rgba(255,249,238,0.6)",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontSize:"0.85rem" }}>Send another</button>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} style={{ display:"flex",flexDirection:"column",gap:"0.75rem" }}>
              <label style={{ display:"flex",flexDirection:"column",gap:"0.3rem",fontSize:"0.8rem",color:"rgba(255,249,238,0.5)",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase" }}>
                Name
                <input value={formName} onChange={e=>setFormName(e.target.value)} placeholder="Your name" type="text" className="contact-form-input" style={inputStyle} />
              </label>
              <label style={{ display:"flex",flexDirection:"column",gap:"0.3rem",fontSize:"0.8rem",color:"rgba(255,249,238,0.5)",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase" }}>
                Email
                <input value={formEmail} onChange={e=>setFormEmail(e.target.value)} placeholder="you@example.com" type="email" className="contact-form-input" style={inputStyle} />
              </label>
              <label style={{ display:"flex",flexDirection:"column",gap:"0.3rem",fontSize:"0.8rem",color:"rgba(255,249,238,0.5)",fontFamily:"'Space Grotesk',sans-serif",letterSpacing:"0.06em",textTransform:"uppercase" }}>
                Message
                <textarea value={formMessage} onChange={e=>setFormMessage(e.target.value)} placeholder="Tell me what you want to build" className="contact-form-input" style={{ ...inputStyle,minHeight:"110px",resize:"vertical" }} />
              </label>
              {formError && <p style={{ color:"#e87070",fontSize:"0.82rem",margin:0,fontFamily:"'Space Grotesk',sans-serif" }}>{formError}</p>}
              <button type="submit" disabled={formStatus==="sending"} className="button primary" style={{ opacity:formStatus==="sending"?0.6:1,cursor:formStatus==="sending"?"default":"pointer",transition:"opacity 0.2s" }}>
                {formStatus==="sending" ? "Sending…" : "Send Message"}
              </button>
            </form>
          )}

          <div className="direct-contact">
            <p>Prefer email?</p>
            <a href="mailto:prajwalgowdads2709@gmail.com" style={{ fontSize:"clamp(1.5rem,2vw,1.35rem)" }}>prajwalgowdads2709@gmail.com</a>
          </div>
        </div>

        <div style={{ marginTop:"0.25rem" }}>
          <Dock items={socialItems} />
        </div>
      </section>

      {/* ── Meme Cats Game ── */}
      <section id="memegame" style={{ ...getSectionStyle(7,progress,config),padding:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center" }}>
        <p className="eyebrow" style={{ marginBottom:"0.4rem",textAlign:"center" }}>Just for fun</p>
        <p style={{ fontFamily:"var(--font-display),Georgia,serif",fontSize:"clamp(2rem,4vw,2.8rem)",fontWeight:800,lineHeight:1.2,color:"var(--ink)",margin:"0 0 0.4rem",textAlign:"center" }}>Think you know your meme cats? 🐱</p>
        <p style={{ marginBottom:"1.25rem",color:"var(--muted)",fontSize:"1rem",textAlign:"center" }}>A little game before you go. No pressure — unless you lose.</p>
        <iframe style={{ maxWidth:"100%",borderRadius:"16px",border:"1px solid rgba(255,249,238,0.1)",boxShadow:"0 8px 40px rgba(0,0,0,0.4)",display:"block" }} src="https://wordwall.net/embed/776b1b424ff349d48ce0a887d4df97ab?themeId=59&templateId=5&fontStackId=0" width="500" height="380" frameBorder="0" allowFullScreen />
      </section>

      {/* ── Experience Popup ── */}
      {activeExp && <ExperiencePopup expId={activeExp} onClose={()=>setActiveExp(null)} />}

      {/* ── Idle Notification ── */}
      {showIdleNotif && <IdleNotification onClose={()=>setShowIdleNotif(false)} onContact={()=>navTo("contact")} />}

      {/* ── Right-click Context Menu ── */}
      {ctxMenu && (
        <div style={{ position:"fixed",top:Math.min(ctxMenu.y,window.innerHeight-220),left:Math.min(ctxMenu.x,window.innerWidth-240),zIndex:9990,background:"rgba(17,25,22,0.98)",border:"1px solid rgba(255,249,238,0.15)",borderRadius:"12px",padding:"6px 0",minWidth:"230px",boxShadow:"0 16px 48px rgba(0,0,0,0.55)",fontFamily:"'Space Grotesk',sans-serif",fontSize:"13px",backdropFilter:"blur(12px)" }} onClick={e=>e.stopPropagation()}>
          {["Back","Forward","Reload page","Save as…","Print…","View page source","Inspect"].map(item=>(
            <div key={item} style={{ padding:"7px 16px",color:"rgba(255,249,238,0.28)",cursor:"default",userSelect:"none" }}>{item}</div>
          ))}
          <div style={{ height:"1px",background:"rgba(255,249,238,0.1)",margin:"4px 0" }} />
          <div onClick={()=>{setCtxMenu(null);navTo("contact")}} style={{ padding:"8px 16px",color:"#fff9ee",cursor:"pointer",fontWeight:600,borderRadius:"0 0 10px 10px",transition:"background 0.15s" }} onMouseEnter={e=>(e.currentTarget.style.background="rgba(186,91,56,0.2)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>nice try 👀 just use the contact form if you like my work</div>
        </div>
      )}

      {/* ── Konami Effect ── */}
      {konamiEffect && (
        <KonamiTrigger
          effect={konamiEffect}
          progress={progress}
          config={config}
          onDone={() => setKonamiEffect(null)}
        />
      )}

      {/* ── Dev Panel ── */}
      {ENABLE_DEV_TOOLS && (
        <DevPanel config={config} onChange={handleChange} onReset={handleReset} onResetIndividual={handleResetIndividual} />
      )}
    </main>
  );
}