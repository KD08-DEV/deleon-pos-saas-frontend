import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    server: {
        open: true,
        port: 5173
    },
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.ico", "robots.txt", "apple-touch-icon.png"],
            manifest: {
                name: "De Leon Soft POS",
                short_name: "POS",
                description: "Sistema de Punto de Venta De Leon Soft",
                theme_color: "#000000",
                background_color: "#000000",
                display: "standalone",
                orientation: "portrait",
                icons: [
                    {
                        src: "/icons/icon-192.png",
                        sizes: "192x192",
                        type: "image/png"
                    },
                    {
                        src: "/icons/icon-512.png",
                        sizes: "512x512",
                        type: "image/png"
                    },
                    {
                        src: "/icons/icon-512-maskable.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "maskable"
                    }
                ]
            },
            workbox: {
                globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "api-cache",
                            expiration: { maxEntries: 50, maxAgeSeconds: 86400 }
                        }
                    },
                    {
                        urlPattern: ({ request }) =>
                            request.destination === "document",
                        handler: "NetworkFirst",
                        options: {
                            cacheName: "html-cache"
                        }
                    },
                    {
                        urlPattern: ({ request }) =>
                            ["style", "script", "worker"].includes(request.destination),
                        handler: "StaleWhileRevalidate",
                        options: {
                            cacheName: "static-resources"
                        }
                    }
                ]
            }
        })
    ],

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
            "@components": path.resolve(__dirname, "./src/components"),
            "@pages": path.resolve(__dirname, "./src/pages"),
            "@https": path.resolve(__dirname, "./src/https"),
        }
    }
});
