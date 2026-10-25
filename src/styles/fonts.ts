import { Archivo, Be_Vietnam_Pro, JetBrains_Mono, Playfair_Display } from "next/font/google";

export const archivo = Archivo({
  subsets: ["latin", "vietnamese"],
  axes: ["wdth"],
  weight: "variable",
  display: "swap",
  variable: "--font-archivo",
  preload: true,
});

export const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
  preload: true,
});

export const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
  display: "optional",
  variable: "--font-jetbrains-mono",
  preload: false,
});

export const playfairDisplay = Playfair_Display({
  subsets: ["latin", "vietnamese"],
  style: "italic",
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-playfair-display",
  preload: false,
});

export const fontVariables = [
  archivo.variable,
  beVietnamPro.variable,
  jetBrainsMono.variable,
  playfairDisplay.variable,
].join(" ");
