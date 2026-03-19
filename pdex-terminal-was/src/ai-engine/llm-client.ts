import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { config } from "../config/index.js";

let genAI: GoogleGenerativeAI | null = null;
let openai: OpenAI | null = null;
let groq: OpenAI | null = null;

function getGemini(): GoogleGenerativeAI {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return genAI;
}

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return openai;
}

function getGroq(): OpenAI {
  if (!groq) {
    groq = new OpenAI({
      apiKey: config.groq.apiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return groq;
}

async function callGemini(system: string, user: string): Promise<string> {
  const model = getGemini().getGenerativeModel({
    model: config.gemini.model,
    systemInstruction: system,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1000,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(user);
  const text = result.response.text();
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

async function callOpenAICompatible(
  client: OpenAI,
  model: string,
  system: string,
  user: string,
  label: string,
): Promise<string> {
  const result = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 1000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  const text = result.choices[0]?.message?.content;
  if (!text) throw new Error(`${label} returned empty response`);
  return text;
}

export async function callLLM(system: string, user: string): Promise<string | null> {
  // 1) Groq first (free, fast)
  if (config.groq.apiKey) {
    try {
      return await callOpenAICompatible(getGroq(), config.groq.model, system, user, "Groq");
    } catch (err) {
      console.warn("Groq failed:", (err as Error).message, "| prompt length:", system.length + user.length);
    }
  }

  // 2) Gemini fallback
  if (config.gemini.apiKey) {
    try {
      return await callGemini(system, user);
    } catch (err) {
      console.warn("Gemini failed:", (err as Error).message);
    }
  }

  // 3) OpenAI fallback
  if (config.openai.apiKey) {
    try {
      return await callOpenAICompatible(getOpenAI(), config.openai.model, system, user, "OpenAI");
    } catch (err) {
      console.error("OpenAI fallback also failed:", (err as Error).message);
    }
  }

  return null;
}
