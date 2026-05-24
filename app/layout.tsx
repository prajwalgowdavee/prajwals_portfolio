import type { Metadata } from "next";
import {
  Cinzel,
  Cormorant_Garamond,
  EB_Garamond,
  Fira_Code,
  Inter
} from "next/font/google";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700"]
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-accent",
  weight: ["400", "600"],
  style: ["italic"]
});

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500"]
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-code",
  weight: ["400", "500"]
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "Prajwal Gowda | AI Developer & Machine Learning Mage",
  description:
    "The journey log of an AI developer walking the Hero's Road through neural networks and intelligent systems.",
  openGraph: {
    title: "Prajwal Gowda | AI Developer & Machine Learning Mage",
    description:
      "A Frieren-inspired portfolio featuring AI systems, model engineering, and production journeys.",
    images: ["/assets/svg/stars.svg"]
  },
  icons: {
    icon: "/assets/svg/rune-favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cormorant.variable} ${ebGaramond.variable} ${firaCode.variable} ${inter.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
