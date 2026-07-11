import { z } from "zod";
import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES } from "../types/crm";

// ---- System prompt: encodes every AI Instruction from the assignment ----
export const SYSTEM_PROMPT = `You are a meticulous CRM data-migration engine for GrowEasy.

You will be given a JSON array of raw CSV rows. Each row was exported from an
UNKNOWN source (Facebook Lead Ads, Google Ads, an Excel sheet, another CRM,
a sales report, or a manually created spreadsheet). Column names are NOT
fixed and vary between uploads — you must infer meaning from header names,
sample values, and context, not from an exact-match lookup.

For every row in the input, return exactly one result object, in the same
order, referencing it by its zero-based "row_index". Never merge, drop, or
reorder rows silently — every row_index from the input must appear exactly
once in your output.

Map available fields into this target schema:
- created_at: lead creation date/time, formatted so that JavaScript's
  "new Date(created_at)" parses it correctly. Prefer ISO 8601
  ("YYYY-MM-DDTHH:mm:ss"). If only a date is available, use midnight. If no
  date exists anywhere in the row, leave it as an empty string.
- name: the lead's full name.
- email: the PRIMARY email address only.
- country_code: phone country code including "+" (e.g. "+91"). Infer from a
  combined phone number, a country field, or context when not explicit.
- mobile_without_country_code: the phone number digits only, with the
  country code stripped out.
- company, city, state, country, lead_owner, possession_time, description:
  map directly when a clearly corresponding column or value exists.
- crm_status: MUST be exactly one of ${CRM_STATUS_VALUES.join(", ")}, or an
  empty string if nothing in the row indicates lead status.
- data_source: MUST be exactly one of ${DATA_SOURCE_VALUES.join(", ")}. Only
  choose one if you are confident it matches; otherwise leave it empty. Do
  NOT invent or guess a value that isn't a confident match.
- crm_note: collect remarks, follow-up notes, extra comments, and ANY
  additional email addresses or phone numbers beyond the first one found
  (each clearly labeled, e.g. "Alt email: x@y.com; Alt phone: 123456").
  Also use this field for any other useful information from the row that
  doesn't fit any other field.

Rules:
1. If a row has multiple email addresses, use the first as "email" and
   append the rest into crm_note.
2. If a row has multiple mobile numbers, use the first as
   "mobile_without_country_code" and append the rest into crm_note.
3. If a row contains NEITHER a usable email NOR a usable mobile number
   anywhere, set "skip" to true and give a short "skip_reason" — do not
   fabricate a record for it.
4. Never invent data that is not present or reasonably inferable from the
   row. Leave a field as an empty string "" if unknown.
5. Keep every value as a single line of text (no literal newlines); if a
   note must contain a line break, use the two characters "\\n" instead of
   an actual newline.
6. Only ever use the exact allowed values listed above for crm_status and
   data_source — never output any other value for those two fields.

Respond only through the extract_crm_records tool call — no prose.`;

// ---- Zod schema used to validate whatever the model returns ----
const crmRecordSchema = z.object({
  created_at: z.string().default(""),
  name: z.string().default(""),
  email: z.string().default(""),
  country_code: z.string().default(""),
  mobile_without_country_code: z.string().default(""),
  company: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  country: z.string().default(""),
  lead_owner: z.string().default(""),
  crm_status: z
    .union([z.enum(CRM_STATUS_VALUES), z.literal("")])
    .default(""),
  crm_note: z.string().default(""),
  data_source: z
    .union([z.enum(DATA_SOURCE_VALUES), z.literal("")])
    .default(""),
  possession_time: z.string().default(""),
  description: z.string().default(""),
});

export const extractionResultItemSchema = z.object({
  row_index: z.number().int().nonnegative(),
  skip: z.boolean().default(false),
  skip_reason: z.string().optional().default(""),
  record: crmRecordSchema.optional(),
});

export const extractionResponseSchema = z.object({
  results: z.array(extractionResultItemSchema),
});

export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;

// ---- JSON schema (used for both OpenAI function calling and Anthropic tool use) ----
export const EXTRACTION_TOOL_NAME = "extract_crm_records";

export const extractionJsonSchema = {
  type: "object",
  properties: {
    results: {
      type: "array",
      description: "One entry per input row, in the same order, referenced by row_index.",
      items: {
        type: "object",
        properties: {
          row_index: { type: "integer" },
          skip: { type: "boolean" },
          skip_reason: { type: "string" },
          record: {
            type: "object",
            properties: {
              created_at: { type: "string" },
              name: { type: "string" },
              email: { type: "string" },
              country_code: { type: "string" },
              mobile_without_country_code: { type: "string" },
              company: { type: "string" },
              city: { type: "string" },
              state: { type: "string" },
              country: { type: "string" },
              lead_owner: { type: "string" },
              crm_status: { type: "string", enum: [...CRM_STATUS_VALUES, ""] },
              crm_note: { type: "string" },
              data_source: { type: "string", enum: [...DATA_SOURCE_VALUES, ""] },
              possession_time: { type: "string" },
              description: { type: "string" },
            },
            required: [
              "created_at", "name", "email", "country_code",
              "mobile_without_country_code", "company", "city", "state",
              "country", "lead_owner", "crm_status", "crm_note",
              "data_source", "possession_time", "description",
            ],
          },
        },
        required: ["row_index", "skip"],
      },
    },
  },
  required: ["results"],
} as const;
