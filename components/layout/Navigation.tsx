"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { navItems } from "@/lib/data";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string>(navItems[0].id);

  const ids = useMemo(() => navItems.map((item) => item.id), []);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 20);

      let closestId = ids[0];
      let smallestDistance = Number.POSITIVE_INFINITY;
      const focusLine = window.innerHeight * 0.32;

      ids.forEach((id) => {
        const section = document.getElementById(id);
        if (!section) {
          return;
        }
        const distance = Math.abs(section.getBoundingClientRect().top - focusLine);
        if (distance < smallestDistance) {
          smallestDistance = distance;
          closestId = id;
        }
      });

      setActiveId((prev) => (prev === closestId ? prev : closestId));
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, [ids]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <header className={`nav-shell ${isScrolled ? "nav-shell--scrolled" : ""}`}>
      <a href="#hero-road" className="nav-brand" aria-label="Go to top">
        <span className="nav-rune" aria-hidden="true">
          *
        </span>
        <span>PG</span>
      </a>

      <nav className="nav-links" aria-label="Main navigation">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`nav-link ${activeId === item.id ? "nav-link--active" : ""}`}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <button
        type="button"
        className="nav-toggle"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="mobile-nav"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <div id="mobile-nav" className={`mobile-nav ${isOpen ? "mobile-nav--open" : ""}`}>
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`mobile-nav__item ${activeId === item.id ? "mobile-nav__item--active" : ""}`}
            onClick={() => setIsOpen(false)}
          >
            {item.label}
          </a>
        ))}
      </div>
    </header>
  );
}
