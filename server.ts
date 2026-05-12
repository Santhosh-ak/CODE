import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAI() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured or is invalid. Please set your API key in the secrets panel.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { repoUrl } = req.body;
      if (!repoUrl) {
         return res.status(400).json({ error: "Repository URL is required" });
      }

      // 1. Parse Repo URL
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        return res.status(400).json({ error: "Invalid GitHub Repository URL" });
      }
      const owner = match[1];
      const repo = match[2].replace('.git', '');

      // 2. Fetch repo tree from GitHub
      // Note: we are limiting to fetching just the root contents or a default branch to avoid huge payloads
      const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`);
      if (!treeResponse.ok) {
        return res.status(treeResponse.status).json({ error: "Failed to fetch repository. Ensure it is public." });
      }
      
      const contents = await treeResponse.json();
      
      // Filter for code files (shallow fetch for prototype)
      const allowedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.cpp', '.c', '.rs', '.php', '.rb'];
      const fileCandidates = contents.filter((item: any) => 
        item.type === 'file' && allowedExtensions.some(ext => item.name.endsWith(ext))
      ).slice(0, 5); // Take max 5 files for speed/token limits

      if (fileCandidates.length === 0) {
        return res.status(400).json({ error: "No recognizable code files found in the repository root." });
      }

      // 3. Fetch file contents
      const fileContexts = [];
      for (const file of fileCandidates) {
        const fileRes = await fetch(file.download_url);
        if (fileRes.ok) {
          const content = await fileRes.text();
          fileContexts.push({ name: file.name, content });
        }
      }

      // 4. Send to Gemini for Analysis
      const prompt = `You are a Senior Security Architect and Expert Code Reviewer.
I am providing you with the contents of ${fileContexts.length} files from the GitHub repository ${owner}/${repo}.

YOUR TASKS:
1. Detect bugs, security vulnerabilities, bad coding practices, performance issues, and scalability problems.
2. Explain WHY each issue matters.
3. Suggest fixes with improved code snippets.
4. Categorize severity as Critical, High, Medium, or Low.
5. Provide overall scores (out of 100) for Security, Code Quality, and Maintainability.

REPO FILES:
${fileContexts.map(f => `--- FILE: ${f.name} ---\n${f.content.substring(0, 3000)} // Truncated if too long\n`).join('\n')}

RESPOND STRICTLY IN THIS JSON FORMAT:
{
  "summary": {
    "securityScore": 85,
    "qualityScore": 70,
    "maintainabilityScore": 75,
    "overview": "A brief overall architectural review..."
  },
  "issues": [
    {
      "id": "uuid-or-random",
      "file": "filename",
      "type": "security|bug|performance|practice",
      "severity": "Critical|High|Medium|Low",
      "title": "Short title of issue",
      "description": "Detailed explanation of why it matters",
      "suggestedFix": "Code snippet showing the fix"
    }
  ]
}`;

      let ai;
      try {
        ai = getAI();
      } catch (err: any) {
        return res.status(401).json({ error: err.message });
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
        }
      });

      const jsonString = response.text();
      let analysisResult;
      try {
        analysisResult = JSON.parse(jsonString!);
      } catch(e) {
        return res.status(500).json({ error: "Failed to parse AI response." });
      }

      res.json({
        owner,
        repo,
        analysis: analysisResult
      });

    } catch (error: any) {
      console.error(error);
      const msg = error.message || "An unexpected error occurred during analysis.";
      res.status(500).json({ error: msg });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
