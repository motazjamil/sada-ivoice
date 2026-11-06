import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "10mb" }));

// Helper to get initialized GoogleGenAI client
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// SEO: Robots.txt endpoint
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://sada-ivoice.ai.studio/sitemap.xml
`);
});

// SEO: XML Sitemap endpoint
app.get("/sitemap.xml", (_req, res) => {
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://sada-ivoice.ai.studio/</loc>
    <lastmod>2026-10-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="ar" href="https://sada-ivoice.ai.studio/" />
    <xhtml:link rel="alternate" hreflang="en" href="https://sada-ivoice.ai.studio/" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://sada-ivoice.ai.studio/" />
  </url>
</urlset>`);
});

// Agentic Browsing & Autonomous Discovery (llms.txt and ARD ai-catalog.json)
app.get("/llms.txt", (_req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.type("text/plain; charset=utf-8").sendFile(path.resolve(process.cwd(), "public/llms.txt"));
});

app.get("/ai-catalog.json", (_req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.type("application/json; charset=utf-8").sendFile(path.resolve(process.cwd(), "public/ai-catalog.json"));
});

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// TTS Generation Endpoint using gemini-3.1-flash-tts-preview
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "Kore", mode = "single", stylePrompt = "", speaker1 = "Speaker 1", speaker2 = "Speaker 2", voice1 = "Puck", voice2 = "Kore" } = req.body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required for TTS generation." });
    }

    const ai = getAIClient();

    if (mode === "multi") {
      // Multi-speaker generation
      const formattedPrompt = stylePrompt 
        ? `${stylePrompt}\n\nTTS the following conversation between ${speaker1} and ${speaker2}:\n${text}`
        : `TTS the following conversation between ${speaker1} and ${speaker2}:\n${text}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: formattedPrompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            multiSpeakerVoiceConfig: {
              speakerVoiceConfigs: [
                {
                  speaker: speaker1,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice1 || "Puck" },
                  },
                },
                {
                  speaker: speaker2,
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice2 || "Kore" },
                  },
                },
              ],
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = audioPart?.data;

      if (!base64Audio) {
        return res.status(500).json({ error: "Failed to generate multi-speaker audio from Gemini TTS." });
      }

      return res.json({
        audioBase64: base64Audio,
        mimeType: audioPart?.mimeType || "audio/pcm;rate=24000",
        sampleRate: 24000,
      });
    } else {
      // Single speaker generation
      const formattedPrompt = stylePrompt ? `${stylePrompt}: ${text}` : text;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: formattedPrompt }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice || "Kore" },
            },
          },
        },
      });

      const audioPart = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = audioPart?.data;

      if (!base64Audio) {
        return res.status(500).json({ error: "Failed to generate audio from Gemini TTS." });
      }

      return res.json({
        audioBase64: base64Audio,
        mimeType: audioPart?.mimeType || "audio/pcm;rate=24000",
        sampleRate: 24000,
      });
    }
  } catch (err: any) {
    console.error("Error in /api/tts:", err);
    res.status(500).json({
      error: err.message || "An unexpected error occurred during TTS synthesis.",
    });
  }
});

// Generate spoken scripts, dialogues, narrations, and voiceovers using gemini-3.7-flash
app.post("/api/generate-script", async (req, res) => {
  try {
    const { topic, format = "speech", language = "ar", tone = "inspiring", category = "general" } = req.body;

    const ai = getAIClient();

    const systemPrompt = `You are an elite voiceover scriptwriter, audio dramatist, and speech coach for Motaz Studio (معتز ستوديو).
Create spoken-word scripts tailored specifically for Text-to-Speech (TTS) audio delivery.
Ensure the text has natural rhythm, pauses, expressive flow, and avoids awkward symbols or unpronounceable formatting.`;

    let userPrompt = "";
    if (language === "ar") {
      if (format === "dialogue") {
        userPrompt = `قم بإنشاء حوار صوتي مشوق وطبيعي بين شخصين حول موضوع: "${topic || "محادثة شيقة وممتعة في استوديو معتز"}".
الأسلوب والنبرة: ${tone}.
يجب أن يكون الحوار جاهزاً للإلقاء الصوتي بصيغة واضحة:
المتحدث 1: ...
المتحدث 2: ...
اجعل الحوار ممتعاً وطبيعياً في النطق ومترابطاً (بين 8 إلى 12 سطراً تبادلياً).`;
      } else {
        userPrompt = `قم بكتابة نص تعليق صوتي / إلقاء / إذاعي جذاب ومميز حول موضوع: "${topic || "نص إلقاء صوتي احترافي في معتز ستوديو"}".
الأسلوب والنبرة: ${tone}.
التصنيف: ${category}.
اجعل النص يتراوح بين 100 إلى 220 كلمة بصياغة بليغة، واضحة التشكيل والنطق، مناسبة تماماً للتوليد الصوتي الاحترافي.`;
      }
    } else {
      if (format === "dialogue") {
        userPrompt = `Create an engaging, natural spoken dialogue between two people about "${topic || "An insightful discussion in Motaz Studio"}".
Tone: ${tone}.
Format strictly as:
Speaker 1: ...
Speaker 2: ...
Keep it natural, rhythmic, and captivating for audio listening (8-12 conversational turns).`;
      } else {
        userPrompt = `Write a high quality spoken voiceover / narration script about "${topic || "A compelling narration crafted in Motaz Studio"}".
Tone: ${tone}.
Category: ${category}.
Length: 100-220 words. Optimized for crisp, natural text-to-speech audio performance.`;
      }
    }

    const PRIMARY_MODEL = "gemini-3.8-flash";
    const FALLBACK_MODEL = "gemini-3.7-flash";

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const isUnavailableError = (err: any): boolean => {
      if (!err) return false;
      const status = err.status || err.statusCode || err.code;
      if (status === 503 || status === "503" || status === "UNAVAILABLE") return true;
      const msg = String(err.message || err.details || "").toLowerCase();
      return (
        msg.includes("503") ||
        msg.includes("unavailable") ||
        msg.includes("high demand") ||
        msg.includes("overloaded") ||
        msg.includes("busy") ||
        msg.includes("resource has been exhausted")
      );
    };

    const callModelWithRetries = async (modelName: string) => {
      const retryDelays = [5000, 15000]; // 5 seconds, then 15 seconds
      let attempt = 0;

      while (true) {
        try {
          const resp = await ai.models.generateContent({
            model: modelName,
            contents: userPrompt,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.7,
            },
          });
          return resp;
        } catch (callErr: any) {
          const is503 = isUnavailableError(callErr);
          if (is503 && attempt < retryDelays.length) {
            const waitMs = retryDelays[attempt];
            console.warn(
              `[Script Composer] Model "${modelName}" returned 503/UNAVAILABLE. Retrying attempt ${attempt + 1}/2 in ${waitMs / 1000}s...`
            );
            await sleep(waitMs);
            attempt++;
            continue;
          }
          throw callErr;
        }
      }
    };

    let response;
    try {
      response = await callModelWithRetries(PRIMARY_MODEL);
    } catch (primaryErr: any) {
      console.warn(
        `[Script Composer] Primary model (${PRIMARY_MODEL}) failed. Falling back to previous model (${FALLBACK_MODEL}). Reason:`,
        primaryErr?.message || primaryErr
      );
      try {
        response = await callModelWithRetries(FALLBACK_MODEL);
      } catch (fallbackErr: any) {
        console.error(`[Script Composer] Fallback model (${FALLBACK_MODEL}) also failed:`, fallbackErr?.message || fallbackErr);
        throw fallbackErr;
      }
    }

    const scriptText = response?.text || "";
    return res.json({ script: scriptText });
  } catch (err: any) {
    console.error("Error in /api/generate-script:", err);
    res.status(500).json({
      error: err.message || "Failed to generate script.",
    });
  }
});

// Setup Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = typeof __dirname !== "undefined" ? __dirname : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
