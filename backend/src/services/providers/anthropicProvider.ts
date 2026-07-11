import type { RawCsvRow } from "../../types/crm";
import type { AIProvider } from "../aiProvider";
import {
  SYSTEM_PROMPT,
  EXTRACTION_TOOL_NAME,
  extractionJsonSchema,
  extractionResponseSchema,
  type ExtractionResponse,
} from "../extractionSchema";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export class AnthropicProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "claude-sonnet-4-6") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async extractBatch(rows: RawCsvRow[]): Promise<ExtractionResponse> {
    const userPayload = rows.map((row, i) => ({ row_index: i, row }));

    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Extract CRM records from these rows:\n${JSON.stringify(userPayload)}`,
          },
        ],
        tools: [
          {
            name: EXTRACTION_TOOL_NAME,
            description: "Return extracted GrowEasy CRM records for a batch of raw CSV rows.",
            input_schema: extractionJsonSchema,
          },
        ],
        tool_choice: { type: "tool", name: EXTRACTION_TOOL_NAME },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as {
      content?: Array<{ type: string; input?: unknown }>;
    };
    const toolUseBlock = data.content?.find(
      (block: { type: string }) => block.type === "tool_use"
    );

    if (!toolUseBlock) {
      throw new Error("Model did not return a structured extraction result.");
    }

    return extractionResponseSchema.parse(toolUseBlock.input);
  }
}
