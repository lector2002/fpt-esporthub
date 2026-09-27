import type { MetadataRoute } from "next";

/** Lets phones add the site to the home screen with the brand icon. Icons come from app/icon.svg (see public/icon-*.png). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FPT EsportHub",
    short_name: "EsportHub",
    description: "Tìm đồng đội, lập đội và thi đấu Valorant, Liên Minh Huyền Thoại.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0e0f0c",
    theme_color: "#0e0f0c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
