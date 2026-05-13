import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAI() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    console.log("DEBUG: GEMINI_API_KEY is", key);
    if (!key || key === "MY_GEMINI_API_KEY") {
      throw new Error(`GEMINI_API_KEY is not configured or is invalid (Current: ${key}). Please set your API key in the secrets panel.`);
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  const PORT = 3000;

  app.use(express.json());

  // --- Rate Limiting ---
  const analyzeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
    message: { error: "Too many analysis requests from this IP, please try again after 15 minutes" },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  // --- API Routes ---
  
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/analyze", analyzeLimiter, async (req, res) => {
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

      const githubHeaders: Record<string, string> = {
        'User-Agent': 'SentinelAI-App'
      };
      if (process.env.GITHUB_TOKEN) {
        githubHeaders['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }

      const fetchFromGitHub = async (url: string) => {
        let res = await fetch(url, { headers: githubHeaders });
        if (res.status === 401 && githubHeaders['Authorization']) {
            // Token might be invalid (e.g. wrongly populated). Try without it.
            const { Authorization, ...headersWithoutAuth } = githubHeaders;
            res = await fetch(url, { headers: headersWithoutAuth });
        }
        return res;
      };

      // 2. Fetch repo info to get default branch
      const repoInfoRes = await fetchFromGitHub(`https://api.github.com/repos/${owner}/${repo}`);
      if (!repoInfoRes.ok) {
        const errText = await repoInfoRes.text();
        console.error("GitHub API Error for Repo Info:", errText);
        return res.status(repoInfoRes.status).json({ error: `Failed to fetch repository info from GitHub. Status: ${repoInfoRes.status}, Error: ${errText}` });
      }
      const repoInfo = await repoInfoRes.json();
      const defaultBranch = repoInfo.default_branch || 'main';

      // 3. Fetch repo tree recursively
      const treeResponse = await fetchFromGitHub(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
      if (!treeResponse.ok) {
        const errText = await treeResponse.text();
        console.error("GitHub API Error for Tree:", errText);
        return res.status(treeResponse.status).json({ error: `Failed to fetch repository tree. Status: ${treeResponse.status}, Error: ${errText}` });
      }
      const treeData = await treeResponse.json();

      // Filter for code files
      const allowedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.cpp', '.c', '.rs', '.php', '.rb'];
      const fileCandidates = (treeData.tree || []).filter((item: any) => 
        item.type === 'blob' && 
        allowedExtensions.some(ext => item.path.endsWith(ext)) &&
        !item.path.includes('node_modules/') &&
        !item.path.includes('dist/') &&
        !item.path.includes('build/') &&
        !item.path.includes('.next/') &&
        !item.path.includes('vendor/')
      ).slice(0, 5); // Take max 5 files for speed/token limits

      if (fileCandidates.length === 0) {
        return res.status(400).json({ error: "No recognizable code files found in the repository." });
      }

      // 4. Fetch file contents
      const fileContexts = [];
      for (const file of fileCandidates) {
        const fileRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`);
        if (fileRes.ok) {
          const content = await fileRes.text();
          fileContexts.push({ name: file.path, content });
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
}`; // CRITICAL: Ensure ALL JSON values are properly escaped. If you include regular expressions, code snippets, or strings with backslashes, you MUST double-escape them (e.g., use \\\\s instead of \\s) so the output is valid JSON.

      let ai;
      try {
        ai = getAI();
      } catch (err: any) {
        return res.status(401).json({ error: err.message });
      }

      const responseSchema = {
        type: "OBJECT",
        properties: {
          summary: {
            type: "OBJECT",
            properties: {
              securityScore: { type: "INTEGER" },
              qualityScore: { type: "INTEGER" },
              maintainabilityScore: { type: "INTEGER" },
              overview: { type: "STRING" }
            },
            required: ["securityScore", "qualityScore", "maintainabilityScore", "overview"]
          },
          issues: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                id: { type: "STRING" },
                file: { type: "STRING" },
                type: { type: "STRING" },
                severity: { type: "STRING" },
                title: { type: "STRING" },
                description: { type: "STRING" },
                suggestedFix: { type: "STRING" }
              },
              required: ["id", "file", "type", "severity", "title", "description", "suggestedFix"]
            }
          }
        },
        required: ["summary", "issues"]
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        }
      });

      let jsonString = response.text || "{}";
      let analysisResult;
      try {
        analysisResult = JSON.parse(jsonString);
      } catch(e: any) {
        console.error("Parse Error:", e);
        console.error("Raw AI response:", response.text);
        return res.status(500).json({ error: `Failed to parse AI response. Error: ${e?.message}` });
      }

      res.json({
        owner,
        repo,
        analysis: analysisResult
      });

    } catch (error: any) {
      const errStr = String(error);
      if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.toLowerCase().includes("quota exceeded")) {
        return res.status(429).json({ error: "Gemini API free tier quota exceeded. Please try again later or provide a paid tiered API key." });
      }
      console.error("ANALYSIS ERROR:", error);
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
