export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type RawCsvRow = Record<string, string>;

export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  row: RawCsvRow;
  reason: string;
}

export interface ImportResult {
  success: CrmRecord[];
  skipped: SkippedRecord[];
  total_imported: number;
  total_skipped: number;
}

export interface PreviewResponse {
  headers: string[];
  rows: RawCsvRow[];
  rowCount: number;
  truncated: boolean;
  allRows: RawCsvRow[];
}

export interface ImportJobStatus {
  status: "processing" | "done" | "error";
  batchesDone: number;
  totalBatches: number;
  result?: ImportResult;
  error?: string;
}

export const CRM_FIELD_ORDER: (keyof CrmRecord)[] = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
];
