"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Github, Sparkles, Star } from "lucide-react";
import { projectItems } from "@/lib/data";

type ProjectFilter = "All" | "AI" | "Web" | "Open Source";

const filters: ProjectFilter[] = ["All", "AI", "Web", "Open Source"];

export function HallOfLegends() {
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>("All");
  const [isQuestLogOpen, setIsQuestLogOpen] = useState(false);

  const filtered = useMemo(() => {
    if (activeFilter === "All") {
      return projectItems;
    }
    return projectItems.filter((item) => item.category === activeFilter);
  }, [activeFilter]);

  const [featured, ...rest] = filtered;

  return (
    <section id="legends" className="section legends">
      <header className="section-heading">
        <p className="eyebrow-text">The Hall of Legends</p>
        <h2>Quests Completed</h2>
        <p>Each project is a chapter in the journey log, forged in constraints and shipped with intent.</p>
      </header>

      <div className="legends__filters">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            className={`legends__filter ${activeFilter === filter ? "legends__filter--active" : ""}`}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {featured ? (
        <motion.article
          className="legend-card legend-card--featured"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div className="legend-card__media">
            <Star size={20} />
            <span>Featured Quest</span>
          </div>
          <div className="legend-card__content">
            <p className="legend-card__meta">
              {featured.id.toUpperCase()} | {featured.status}
            </p>
            <h3>{featured.title}</h3>
            <p>{featured.summary}</p>
            <div className="tag-wrap">
              {featured.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
            <div className="legend-card__links">
              <a href={featured.links.code} target="_blank" rel="noopener noreferrer">
                <Github size={14} />
                Code
              </a>
              <a href={featured.links.demo} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} />
                Demo
              </a>
            </div>
          </div>
        </motion.article>
      ) : null}

      <div className="legends__grid">
        {rest.map((project, idx) => (
          <motion.article
            key={project.id}
            className={`legend-card ${idx % 2 === 1 ? "legend-card--reverse" : ""}`}
            initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.24 }}
            transition={{ duration: 0.45 }}
          >
            <div className="legend-card__media">
              <Sparkles size={18} />
              <span>{project.category}</span>
            </div>
            <div className="legend-card__content">
              <p className="legend-card__meta">
                {project.id.toUpperCase()} | {project.status}
              </p>
              <h3>{project.title}</h3>
              <p>{project.summary}</p>
              <div className="tag-wrap">
                {project.tags.map((tag) => (
                  <span key={tag} className="tag-chip">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="legend-card__links">
                <a href={project.links.code} target="_blank" rel="noopener noreferrer">
                  <Github size={14} />
                  Code
                </a>
                <a href={project.links.demo} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} />
                  Demo
                </a>
              </div>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="quest-log">
        <button type="button" className="rune-button rune-button--secondary" onClick={() => setIsQuestLogOpen(true)}>
          Open Quest Log
        </button>
      </div>

      {isQuestLogOpen ? (
        <div className="quest-log-modal" role="dialog" aria-modal="true" aria-label="Quest log">
          <div className="quest-log-modal__panel">
            <h3>Quest Log</h3>
            <ul>
              {projectItems.map((project) => (
                <li key={project.id}>
                  <span>{project.id.toUpperCase()}</span>
                  <p>{project.title}</p>
                </li>
              ))}
            </ul>
            <button type="button" className="rune-button rune-button--ghost" onClick={() => setIsQuestLogOpen(false)}>
              Close
            </button>
          </div>
          <button
            type="button"
            className="quest-log-modal__backdrop"
            aria-label="Close quest log"
            onClick={() => setIsQuestLogOpen(false)}
          />
        </div>
      ) : null}
    </section>
  );
}
