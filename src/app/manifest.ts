import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bharat Stores",
    short_name: "Bharat Stores",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f5f4",
    theme_color: "#ea580c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
