import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/instagram/account", async (req, res) => {
    try {
      const { instagramService } = await import("./src/services/instagram");
      const account = await instagramService.getAccount();
      res.json(account);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/instagram/media", async (req, res) => {
    try {
      const { instagramService } = await import("./src/services/instagram");
      const media = await instagramService.getMedia();
      const enrichedMedia = await Promise.all(
        media.slice(0, 10).map(async (item) => {
          try {
            const insights = await instagramService.getMediaInsights(item.id);
            return { ...item, insights };
          } catch {
            return item;
          }
        })
      );
      res.json(enrichedMedia);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/instagram/insights", async (req, res) => {
    try {
      const { instagramService } = await import("./src/services/instagram");
      const insights = await instagramService.getAccountInsights();
      res.json(insights);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/instagram/performance", async (req, res) => {
    try {
      const { instagramService } = await import("./src/services/instagram");
      const performance = await instagramService.getContentPerformanceByType();
      res.json(performance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/instagram/audience", async (req, res) => {
    try {
      const { instagramService } = await import("./src/services/instagram");
      const audience = await instagramService.getAudienceInsights();
      res.json(audience);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/instagram/comments", async (req, res) => {
    try {
      const { instagramService } = await import("./src/services/instagram");
      const media = await instagramService.getMedia(10);
      const commentsPromises = media.map(m => instagramService.getComments(m.id));
      const commentsResults = await Promise.all(commentsPromises);
      
      // Flatten and add post info
      const allComments = commentsResults.flatMap((comments, index) => 
        comments.map(c => ({
          ...c,
          post_thumb: media[index].thumbnail_url || media[index].media_url,
          post_id: media[index].id
        }))
      );

      // Sort by timestamp
      allComments.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json(allComments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai", async (req, res) => {
    try {
      const { aiService } = await import("./src/services/ai");
      const { type, data } = req.body;
      let result;
      if (type === 'summary') result = await aiService.generateExecutiveSummary(data);
      else if (type === 'post_analysis') result = await aiService.analyzePostPerformance(data);
      res.json({ result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/orchestrator", async (req, res) => {
    try {
      const { instagramService } = await import("./src/services/instagram");
      const { aiService } = await import("./src/services/ai");

      const [account, insights, performance, media] = await Promise.all([
        instagramService.getAccount(),
        instagramService.getAccountInsights(),
        instagramService.getContentPerformanceByType(),
        instagramService.getMedia(10)
      ]);

      const analysisData = {
        account,
        insights,
        performance,
        recentMedia: media.map(m => ({
          caption: m.caption,
          type: m.media_type,
          likes: m.like_count,
          comments: m.comments_count
        }))
      };

      const analysis = await aiService.getDeepAccountAnalysis(analysisData);
      res.json({ analysis });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // In production, we serve static files from the dist directory
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // For SPA, redirect all requests to index.html
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // In development, we use Vite's middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
