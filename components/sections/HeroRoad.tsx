"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, Download } from "lucide-react";
import { heroTypeLines } from "@/lib/data";

export function HeroRoad() {
  const [lineIndex, setLineIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const currentLine = useMemo(() => heroTypeLines[lineIndex], [lineIndex]);

  useEffect(() => {
    const idleDelay = deleting ? 35 : 65;
    const timer = window.setTimeout(() => {
      if (!deleting) {
        if (typed.length < currentLine.length) {
          setTyped(currentLine.slice(0, typed.length + 1));
          return;
        }
        window.setTimeout(() => setDeleting(true), 1100);
        return;
      }

      if (typed.length > 0) {
        setTyped(currentLine.slice(0, typed.length - 1));
        return;
      }

      setDeleting(false);
      setLineIndex((prev) => (prev + 1) % heroTypeLines.length);
    }, idleDelay);

    return () => window.clearTimeout(timer);
  }, [currentLine, deleting, typed]);

  return (
    <section id="hero-road" className="section hero-road">
      <div className="hero-road__layers" aria-hidden="true">
        <div className="hero-road__layer hero-road__layer--stars" />
        <div className="hero-road__layer hero-road__layer--aurora" />
        <div className="hero-road__layer hero-road__layer--mountains" />
        <div className="hero-road__layer hero-road__layer--circle" />
      </div>

      <div className="hero-road__content">
        <p className="eyebrow-text">The Road&apos;s Beginning at Dawn</p>
        <h1 className="hero-road__title">Prajwal Gowda</h1>
        <p className="hero-road__divider">* -------- *</p>
        <p className="hero-road__subtitle">
          {typed}
          <span className="hero-road__cursor" aria-hidden="true">
            _
          </span>
        </p>

        <div className="hero-road__actions">
          <a href="#legends" className="rune-button rune-button--primary">
            View My Work
          </a>
          <a href="#crystal" className="rune-button rune-button--secondary">
            Connect
          </a>
          <a href="#" className="rune-button rune-button--ghost">
            <Download size={14} />
            Resume
          </a>
        </div>
      </div>

      <a className="hero-road__scroll" href="#grimoire" aria-label="Scroll to next section">
        <ArrowDown size={16} />
      </a>
    </section>
  );
}
