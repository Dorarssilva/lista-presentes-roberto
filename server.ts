import express from "express";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy to fetch OpenGraph data
  app.get("/api/og", async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: "URL is required" });

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
      });
      const html = await response.text();
      const $ = cheerio.load(html);

      const ogTitle = $('meta[property="og:title"]').attr('content') || $('title').text();
      const ogImage = $('meta[property="og:image"]').attr('content');

      res.json({
        title: ogTitle || null,
        image: ogImage || null
      });
    } catch (error) {
      console.error("Error fetching OG data:", error);
      res.status(500).json({ error: "Failed to fetch metadata" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
