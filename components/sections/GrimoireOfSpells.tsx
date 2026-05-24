"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { type SkillCategoryKey, skillCategoryLabels, skillsByCategory } from "@/lib/data";

const categoryOrder: SkillCategoryKey[] = [
  "languageModels",
  "agentsPipelines",
  "machineLearning",
  "cloudInfra",
  "toolingDev"
];

export function GrimoireOfSpells() {
  const [activeCategory, setActiveCategory] = useState<SkillCategoryKey>("languageModels");

  const activeSkills = useMemo(
    () => skillsByCategory[activeCategory],
    [activeCategory]
  );

  return (
    <section id="grimoire" className="section grimoire">
      <header className="section-heading">
        <p className="eyebrow-text">The Grimoire Tower</p>
        <h2>Spells I Have Mastered</h2>
        <p>
          Each ability earned through study, iteration, and battles with real production systems.
        </p>
      </header>

      <div className="grimoire__layout">
        <div className="grimoire__tabs" role="tablist" aria-label="Skill categories">
          {categoryOrder.map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`grimoire__tab ${isActive ? "grimoire__tab--active" : ""}`}
                onClick={() => setActiveCategory(category)}
              >
                {skillCategoryLabels[category]}
              </button>
            );
          })}
        </div>

        <div className="grimoire__cards">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="grimoire__card-grid"
            >
              {activeSkills.map((skill, idx) => (
                <motion.article
                  key={skill.name}
                  className="spell-card"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.35 }}
                >
                  <div className="spell-card__head">
                    <h3>{skill.name}</h3>
                    <span>{skill.years}</span>
                  </div>
                  <div className="spell-card__mana" aria-hidden="true">
                    <div
                      className="spell-card__mana-fill"
                      style={{ width: `${skill.level}%` }}
                    />
                  </div>
                  <p>{skill.description}</p>
                </motion.article>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
