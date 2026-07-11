import type { AIProvider } from "./aiProvider";
import { OpenAIProvider } from "./providers/openaiProvider";
import { AnthropicProvider } from "./providers/anthropicProvider";
import { GeminiProvider } from "./providers/geminiProvider";

export function createAIProvider(): AIProvider {
  const providerName = (process.env.AI_PROVIDER || "openai").toLowerCase();

  if (providerName === "gemini" || providerName === "google") {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY is not set in the environment.");
    return new GeminiProvider(key, process.env.GEMINI_MODEL);
  }

  if (providerName === "anthropic" || providerName === "claude") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY is not set in the environment.");
    return new AnthropicProvider(key, process.env.ANTHROPIC_MODEL);
  }

  if (providerName === "openai" || providerName === "gpt") {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY is not set in the environment.");
    return new OpenAIProvider(key, process.env.OPENAI_MODEL);
  }

  throw new Error(
    `Unknown AI_PROVIDER "${providerName}". Use "openai", "anthropic", or "gemini".`
  );
}
