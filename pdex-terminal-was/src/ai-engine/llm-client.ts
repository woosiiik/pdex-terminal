import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { config } from "../config/index.js";

let anthropic: Anthropic | null = null;
let genAI: GoogleGenerativeAI | null = null;
let openai: OpenAI | null = null;
let groq: OpenAI | null = null;

function getClaude(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({ apiKey: config.claude.apiKey });
  }
  return anthropic;
}

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

async function callClaude(system: string, user: string): Promise<string> {
  const result = await getClaude().messages.create({
    model: config.claude.model,
    max_tokens: 1000,
    temperature: 0.3,
    system,
    messages: [{ role: "user", content: user + "\n\nRespond with valid JSON only." }],
  });

  const block = result.content[0];
  if (block.type !== "text" || !block.text) throw new Error("Claude returned empty response");
  return block.text;
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

export interface LLMResult {
  text: string;
  model: string;
}

export async function callLLM(system: string, user: string): Promise<LLMResult | null> {
  // 1) Claude first (primary)
  if (config.claude.apiKey) {
    try {
      const text = await callClaude(system, user);
      return { text, model: config.claude.model };
    } catch (err) {
      console.warn("Claude failed:", (err as Error).message);
    }
  }

  // 2) Groq fallback (free, fast)
  if (config.groq.apiKey) {
    try {
      const text = await callOpenAICompatible(getGroq(), config.groq.model, system, user, "Groq");
      return { text, model: config.groq.model };
    } catch (err) {
      console.warn("Groq failed:", (err as Error).message, "| prompt length:", system.length + user.length);
    }
  }

  // 3) Gemini fallback
  if (config.gemini.apiKey) {
    try {
      const text = await callGemini(system, user);
      return { text, model: config.gemini.model };
    } catch (err) {
      console.warn("Gemini failed:", (err as Error).message);
    }
  }

  // 4) OpenAI fallback
  if (config.openai.apiKey) {
    try {
      const text = await callOpenAICompatible(getOpenAI(), config.openai.model, system, user, "OpenAI");
      return { text, model: config.openai.model };
    } catch (err) {
      console.error("OpenAI fallback also failed:", (err as Error).message);
    }
  }

  return null;
}
