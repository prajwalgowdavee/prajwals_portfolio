const navItems = [
  { id: "hero", label: "Hero" },
  { id: "about", label: "About Me" },
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "resume", label: "Resume" },
  { id: "contact", label: "Contact" }
];

const skills = [
  "Machine Learning",
  "Python",
  "LLMs",
  "Prompt Engineering",
  "Vector Databases",
  "RAG Systems",
  "Deep Learning",
  "Data Pipelines",
  "APIs",
  "Model Evaluation",
  "MLOps",
  "Automation"
];

const projects = [
  {
    title: "RAG Knowledge Assistant",
    description:
      "A retrieval-augmented AI assistant that turns private documents into fast, cited answers for teams.",
    stack: "LLMs / Embeddings / Vector Search",
    href: "#contact"
  },
  {
    title: "AI Workflow Copilot",
    description:
      "Automation layer that connects APIs, summarizes decisions, and helps teams reduce repetitive knowledge work.",
    stack: "Python / Agents / APIs",
    href: "#contact"
  },
  {
    title: "ML Insight Dashboard",
    description:
      "A model-monitoring dashboard for tracking quality signals, drift patterns, and business-facing outcomes.",
    stack: "ML / Analytics / Visualization",
    href: "#contact"
  }
];

const timeline = [
  {
    period: "Now",
    role: "AI Engineer",
    detail:
      "Building practical AI systems with LLMs, automation, and thoughtful user-facing workflows."
  },
  {
    period: "2025",
    role: "Applied ML Projects",
    detail:
      "Designed experiments, trained models, and turned messy data into useful intelligence."
  },
  {
    period: "2024",
    role: "Python + Data Foundations",
    detail:
      "Strengthened core engineering habits across Python, APIs, data handling, and product thinking."
  }
];

export default function Home() {
  return (
    <main>
      <aside className="side-nav" aria-label="Section navigation">
        {navItems.map((item) => (
          <a className="nav-diamond" href={`#${item.id}`} key={item.id}>
            <span>{item.label}</span>
          </a>
        ))}
      </aside>

      <section className="hero section-shell" id="hero">
        <div className="hero-copy">
          <p className="eyebrow">Portfolio / AI systems / Useful intelligence</p>

          <h1 className="hero-name">Prajwal Gowda D S</h1>

          <p className="title-pill">AI Engineer</p>

          <p className="hero-tagline">
            I build AI that feels less like a black box and more like a sharp teammate.
          </p>
        </div>
      </section>

      <section className="section-shell split" id="about">
        <div>
          <p className="eyebrow">About Me</p>
          <h2>Curious builder, practical dreamer.</h2>

          <p>
            I like working where ideas become tools. My path into AI has been shaped by
            a simple obsession: take complex systems, make them understandable, and turn
            them into something people can actually use.
          </p>

          <p>
            I&apos;m especially drawn to LLM products, data-rich workflows, and the craft
            of making intelligent software feel calm, reliable, and human.
          </p>
        </div>

        <div className="photo-placeholder">
          <span>Photo</span>
          <small>Add your portrait here</small>
        </div>
      </section>

      <section className="section-shell" id="skills">
        <p className="eyebrow">Skills</p>
        <h2>Technical stack with teeth.</h2>

        <div className="skill-grid">
          {skills.map((skill) => (
            <div className="skill-card" key={skill}>
              {skill}
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell" id="projects">
        <p className="eyebrow">Projects / Work</p>
        <h2>Selected AI builds.</h2>

        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project.title}>
              <p>{project.stack}</p>

              <h3>{project.title}</h3>

              <span>{project.description}</span>

              <a href={project.href}>Open case study</a>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell" id="experience">
        <p className="eyebrow">Career / Experience</p>
        <h2>Route map of the journey.</h2>

        <div className="timeline">
          {timeline.map((item) => (
            <article className="timeline-stop" key={`${item.period}-${item.role}`}>
              <div className="timeline-marker" />

              <div>
                <p>{item.period}</p>

                <h3>{item.role}</h3>

                <span>{item.detail}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell resume-band" id="resume">
        <div>
          <p className="eyebrow">Resume / CV</p>

          <h2>Need the concise version?</h2>

          <p>
            Drop your resume into <code>public/resume.pdf</code>, and this button will
            download it directly.
          </p>
        </div>

        <a className="button primary" href="/resume.pdf" download>
          Download Resume
        </a>
      </section>

      <section className="section-shell contact" id="contact">
        <p className="eyebrow">Contact</p>

        <h2>Let&apos;s build something intelligent.</h2>

        <div className="contact-panel">
          <form
            action="mailto:prajwalgowdads2709@gmail.com"
            method="post"
            encType="text/plain"
          >
            <label>
              Name
              <input name="name" placeholder="Your name" type="text" />
            </label>

            <label>
              Email
              <input name="email" placeholder="you@example.com" type="email" />
            </label>

            <label>
              Message
              <textarea
                name="message"
                placeholder="Tell me what you want to build"
              />
            </label>

            <button className="button primary" type="submit">
              Send Message
            </button>
          </form>

          <div className="direct-contact">
            <p>Prefer email?</p>

            <a href="mailto:prajwalgowdads2709@gmail.com">
              prajwalgowdads2709@gmail.com
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}