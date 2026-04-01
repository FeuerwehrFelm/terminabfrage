import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gemeindefeuerwehr Felm",
    short_name: "GF Felm",
    description: "Rueckmeldungen zu Diensten und Terminen der Gemeindefeuerwehr Felm.",
    start_url: "/teilnahme",
    scope: "/",
    display: "standalone",
    background_color: "#081120",
    theme_color: "#081120",
    orientation: "portrait",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
