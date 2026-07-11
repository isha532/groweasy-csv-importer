import OpenAI from "openai";
import type { RawCsvRow } from "../../types/crm";
import type { AIProvider } from "../aiProvider";
import {
  SYSTEM_PROMPT,
  EXTRACTION_TOOL_NAME,
  extractionJsonSchema,
  extractionResponseSchema,
  type ExtractionResponse,
} from "../extractionSchema";

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o-mini") {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async extractBatch(rows: RawCsvRow[]): Promise<ExtractionResponse> {
    const userPayload = rows.map((row, i) => ({ row_index: i, row }));

    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Extract CRM records from these rows:\n${JSON.stringify(userPayload)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: EXTRACTION_TOOL_NAME,
            description: "Return extracted GrowEasy CRM records for a batch of raw CSV rows.",
            parameters: extractionJsonSchema,
          },
        },
      ],
      tool_choice: {
        type: "function",
        function: { name: EXTRACTION_TOOL_NAME },
      },
    });

    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== EXTRACTION_TOOL_NAME) {
      throw new Error("Model did not return a structured extraction result.");
    }

    const parsedArgs = JSON.parse(toolCall.function.arguments);
    return extractionResponseSchema.parse(parsedArgs);
  }
}
