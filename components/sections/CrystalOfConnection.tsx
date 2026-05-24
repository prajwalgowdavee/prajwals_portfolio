"use client";

import { FormEvent, useState } from "react";
import { Github, Linkedin, Mail, Send } from "lucide-react";

export function CrystalOfConnection() {
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setSuccessMessage("");

    await new Promise((resolve) => window.setTimeout(resolve, 1700));

    setSending(false);
    setSuccessMessage("Your message has been carried on the wind. I shall respond when the path allows.");
    event.currentTarget.reset();
  }

  return (
    <section id="crystal" className="section crystal">
      <div className="crystal__orb" aria-hidden="true" />

      <header className="section-heading">
        <p className="eyebrow-text">The Crystal of Connection</p>
        <h2>Leave a Message</h2>
        <p>Whether you seek a collaborator, a builder, or a fellow learner, the crystal is listening.</p>
      </header>

      <form className="crystal-form" onSubmit={handleSubmit}>
        <label>
          Name
          <input className="crystal-input" type="text" name="name" required />
        </label>

        <label>
          Email
          <input className="crystal-input" type="email" name="email" required />
        </label>

        <label>
          Your Quest
          <textarea className="crystal-input" name="message" rows={5} required />
        </label>

        <button type="submit" className="rune-button rune-button--primary" disabled={sending}>
          {sending ? "Casting..." : "Cast Your Message"}
          <Send size={14} />
        </button>
      </form>

      <p className="crystal__success" aria-live="polite">
        {successMessage}
      </p>

      <div className="crystal__socials">
        <a href="https://github.com" target="_blank" rel="noopener noreferrer">
          <Github size={15} />
          GitHub
        </a>
        <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer">
          <Linkedin size={15} />
          LinkedIn
        </a>
        <a href="mailto:hello@example.com">
          <Mail size={15} />
          Email
        </a>
      </div>
    </section>
  );
}
