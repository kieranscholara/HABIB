import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ħabib — Small steps. Bright minds.",
    short_name: "Ħabib",
    description: "Maths, English, Maltese and Science practice for your family",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f7f2",
    theme_color: "#456e52",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
