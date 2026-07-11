// Allowed enum values as per assignment spec — AI must only ever emit these.
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

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];
export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

// The target GrowEasy CRM shape every extracted record must conform to.
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
  crm_status: CrmStatus | "";
  crm_note: string;
  data_source: DataSource | "";
  possession_time: string;
  description: string;
}

// A raw row exactly as parsed from the uploaded CSV — arbitrary, unknown headers.
export type RawCsvRow = Record<string, string>;

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
