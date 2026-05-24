"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { journeyEvents } from "@/lib/data";

export function TimelineOfJourneys() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function updateProgress() {
      const section = sectionRef.current;
      if (!section) {
        return;
      }

      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight;
      const start = viewport * 0.2;
      const end = rect.height + viewport * 0.25;
      const value = ((start - rect.top) / end) * 100;
      setProgress(Math.max(0, Math.min(100, value)));
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return (
    <section id="journeys" ref={sectionRef} className="section journeys">
      <header className="section-heading">
        <p className="eyebrow-text">The Timeline of Centuries</p>
        <h2>Years of the Journey</h2>
        <p>Milestones drawn like a map unrolling over time, each step carved into the road.</p>
      </header>

      <div className="journeys__timeline">
        <div className="journeys__track" aria-hidden="true">
          <div className="journeys__track-fill" style={{ height: `${progress}%` }} />
        </div>

        <div className="journeys__events">
          {journeyEvents.map((event, idx) => (
            <motion.article
              key={`${event.period}-${event.role}`}
              className={`journey-card ${idx % 2 === 1 ? "journey-card--right" : "journey-card--left"} ${event.isOrigin ? "journey-card--origin" : ""}`}
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45, delay: idx * 0.05 }}
            >
              <span className="journey-card__node" aria-hidden="true" />
              <p className="journey-card__period">{event.period}</p>
              <h3>{event.role}</h3>
              <p>{event.details}</p>
              <div className="tag-wrap">
                {event.tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
