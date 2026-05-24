export type SkillCategoryKey =
  | "languageModels"
  | "agentsPipelines"
  | "machineLearning"
  | "cloudInfra"
  | "toolingDev";

export interface SkillItem {
  name: string;
  level: number;
  years: string;
  description: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  summary: string;
  status: "Completed" | "In Progress";
  category: "AI" | "Web" | "Open Source";
  tags: string[];
  links: {
    code: string;
    demo: string;
  };
}

export interface JourneyEvent {
  period: string;
  role: string;
  details: string;
  tags: string[];
  isOrigin?: boolean;
}

export const navItems = [
  { id: "hero-road", label: "Road" },
  { id: "grimoire", label: "Grimoire" },
  { id: "legends", label: "Legends" },
  { id: "journeys", label: "Journeys" },
  { id: "crystal", label: "Crystal" }
] as const;

export const skillCategoryLabels: Record<SkillCategoryKey, string> = {
  languageModels: "Language Models",
  agentsPipelines: "AI Agents & Pipelines",
  machineLearning: "Machine Learning",
  cloudInfra: "Cloud & Infra",
  toolingDev: "Tooling & Dev"
};

export const skillsByCategory: Record<SkillCategoryKey, SkillItem[]> = {
  languageModels: [
    {
      name: "Python",
      level: 94,
      years: "5 years",
      description: "Primary language for training pipelines, evaluations, and production orchestration."
    },
    {
      name: "PyTorch",
      level: 88,
      years: "4 years",
      description: "Fine-tuning and experimentation workflows with reproducible model checkpoints."
    },
    {
      name: "Transformers",
      level: 90,
      years: "4 years",
      description: "Model adaptation and inference patterns using Hugging Face tooling."
    },
    {
      name: "OpenAI API",
      level: 92,
      years: "3 years",
      description: "Structured outputs, tool calling, and assistant orchestration in production."
    },
    {
      name: "vLLM",
      level: 80,
      years: "2 years",
      description: "High-throughput inference tuning for low latency and predictable serving."
    }
  ],
  agentsPipelines: [
    {
      name: "LangGraph",
      level: 87,
      years: "2 years",
      description: "Stateful graph orchestration for multi-step agent systems."
    },
    {
      name: "CrewAI",
      level: 79,
      years: "1.5 years",
      description: "Task specialization patterns for collaborative agent workflows."
    },
    {
      name: "RAG Pipelines",
      level: 91,
      years: "3 years",
      description: "Retrieval, reranking, context shaping, and grounded answer generation."
    },
    {
      name: "Vector Databases",
      level: 84,
      years: "3 years",
      description: "Pinecone, Weaviate, and Chroma index design for robust semantic recall."
    },
    {
      name: "Function Calling",
      level: 88,
      years: "3 years",
      description: "Tool contracts with retries, guards, and observable execution traces."
    }
  ],
  machineLearning: [
    {
      name: "LoRA / QLoRA",
      level: 86,
      years: "3 years",
      description: "Parameter-efficient adaptation with constrained hardware budgets."
    },
    {
      name: "PEFT",
      level: 82,
      years: "3 years",
      description: "Adapter composition and evaluation strategies across datasets."
    },
    {
      name: "Embeddings",
      level: 89,
      years: "4 years",
      description: "Embedding quality checks and semantic relevance diagnostics."
    },
    {
      name: "RAGAS / TruLens",
      level: 76,
      years: "2 years",
      description: "Evaluation metrics and regressions for retrieval and response quality."
    },
    {
      name: "DPO",
      level: 72,
      years: "1 year",
      description: "Preference optimization experiments for response alignment."
    }
  ],
  cloudInfra: [
    {
      name: "AWS",
      level: 85,
      years: "3 years",
      description: "LLM service infrastructure with scalable compute and observability."
    },
    {
      name: "Docker",
      level: 90,
      years: "4 years",
      description: "Containerized builds and reproducible runtime environments."
    },
    {
      name: "Kubernetes",
      level: 75,
      years: "2 years",
      description: "Service orchestration for reliable inference workloads."
    },
    {
      name: "FastAPI",
      level: 89,
      years: "4 years",
      description: "Typed APIs for LLM serving, evaluation, and retrieval."
    },
    {
      name: "Terraform",
      level: 73,
      years: "2 years",
      description: "Infrastructure as code for repeatable AI platform provisioning."
    }
  ],
  toolingDev: [
    {
      name: "Git",
      level: 92,
      years: "5 years",
      description: "Clean branching, release hygiene, and collaboration workflows."
    },
    {
      name: "Jupyter",
      level: 90,
      years: "5 years",
      description: "Notebook-driven iteration for model probing and experiments."
    },
    {
      name: "Weights & Biases",
      level: 82,
      years: "2 years",
      description: "Centralized experiment tracking and comparative dashboards."
    },
    {
      name: "MLflow",
      level: 77,
      years: "2 years",
      description: "Model registry patterns and deployment handoff workflows."
    },
    {
      name: "Streamlit",
      level: 84,
      years: "3 years",
      description: "Rapid prototyping for assistant demos and evaluation tooling."
    }
  ]
};

export const projectItems: ProjectItem[] = [
  {
    id: "quest-01",
    title: "Multi-Agent Research Orchestrator",
    summary:
      "A modular system where planner, researcher, verifier, and summarizer agents collaborate to produce grounded technical reports.",
    status: "Completed",
    category: "AI",
    tags: ["Python", "LangGraph", "OpenAI API", "PostgreSQL"],
    links: {
      code: "#",
      demo: "#"
    }
  },
  {
    id: "quest-02",
    title: "RAG Knowledge Console",
    summary:
      "Retrieval stack with dense and sparse search, confidence scoring, and source-grounding panes for transparent answers.",
    status: "Completed",
    category: "AI",
    tags: ["FastAPI", "Chroma", "Redis", "TypeScript"],
    links: {
      code: "#",
      demo: "#"
    }
  },
  {
    id: "quest-03",
    title: "Fine-Tuning Workbench",
    summary:
      "LoRA and QLoRA pipeline manager with checkpoint cataloging, benchmark runs, and deployment-ready export paths.",
    status: "Completed",
    category: "Open Source",
    tags: ["PyTorch", "PEFT", "Weights & Biases"],
    links: {
      code: "#",
      demo: "#"
    }
  },
  {
    id: "quest-04",
    title: "Realtime Model Ops Dashboard",
    summary:
      "Operator dashboard for tracing latency, drift, and tool-call reliability across live assistant environments.",
    status: "In Progress",
    category: "Web",
    tags: ["Next.js", "WebSockets", "AWS", "MLflow"],
    links: {
      code: "#",
      demo: "#"
    }
  }
];

export const journeyEvents: JourneyEvent[] = [
  {
    period: "2024 - Present",
    role: "Senior AI Engineer | Northstar Labs",
    details:
      "Leading LLM workflow reliability, retrieval architecture, and model operations for enterprise assistants.",
    tags: ["Python", "LangChain", "AWS"]
  },
  {
    period: "2022 - 2024",
    role: "Machine Learning Engineer | Arcvale Systems",
    details:
      "Built ranking and retrieval services with strong observability, reducing response drift and latency.",
    tags: ["PyTorch", "Transformers", "Docker"]
  },
  {
    period: "2020 - 2022",
    role: "Software Engineer | Insight Forge",
    details:
      "Developed API platforms and data pipelines that became the base for later AI product layers.",
    tags: ["TypeScript", "FastAPI", "PostgreSQL"]
  },
  {
    period: "Where the Journey Began",
    role: "B.E. Computer Science",
    details:
      "Built foundations in machine learning, algorithms, and systems design that shaped my engineering approach.",
    tags: ["Algorithms", "Systems", "ML Basics"],
    isOrigin: true
  }
];

export const heroTypeLines = [
  "I build AI agents.",
  "I fine-tune language models.",
  "I craft intelligent systems."
];
