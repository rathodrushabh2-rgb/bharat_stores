import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bharat Stores",
    short_name: "Bharat Stores",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F5EF",
    theme_color: "#C84B11",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
