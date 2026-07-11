import type { RawCsvRow } from "../../types/crm";
import type { AIProvider } from "../aiProvider";
import {
  SYSTEM_PROMPT,
  EXTRACTION_TOOL_NAME,
  extractionJsonSchema,
  extractionResponseSchema,
  type ExtractionResponse,
} from "../extractionSchema";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gemini-2.5-flash") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async extractBatch(rows: RawCsvRow[]): Promise<ExtractionResponse> {
    const userPayload = rows.map((row, i) => ({ row_index: i, row }));

    const response = await fetch(
      `${GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              role: "user",
              parts: [
                { text: `Extract CRM records from these rows:\n${JSON.stringify(userPayload)}` },
              ],
            },
          ],
          tools: [
            {
              functionDeclarations: [
                {
                  name: EXTRACTION_TOOL_NAME,
                  description: "Return extracted GrowEasy CRM records for a batch of raw CSV rows.",
                  parameters: extractionJsonSchema,
                },
              ],
            },
          ],
          toolConfig: {
            functionCallingConfig: { mode: "ANY", allowedFunctionNames: [EXTRACTION_TOOL_NAME] },
          },
          generationConfig: { temperature: 0 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ functionCall?: { name: string; args: unknown } }> };
      }>;
    };

    const parts = data.candidates?.[0]?.content?.parts || [];
    const functionCall = parts.find((p) => p.functionCall?.name === EXTRACTION_TOOL_NAME)?.functionCall;

    if (!functionCall) {
      throw new Error("Model did not return a structured extraction result.");
    }

    return extractionResponseSchema.parse(functionCall.args);
  }
}
