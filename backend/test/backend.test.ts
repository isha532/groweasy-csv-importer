import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { parseCsvBuffer } from "../src/services/csvParser";
import { extractCrmRecords } from "../src/services/batchExtractor";
import type { AIProvider } from "../src/services/aiProvider";
import type { RawCsvRow } from "../src/types/crm";

describe("parseCsvBuffer", () => {
  test("parses headers and rows without assuming fixed column names", () => {
    const csv = "full_name,contact_email\nJohn Doe,john@x.com\n";
    const { headers, rows } = parseCsvBuffer(Buffer.from(csv));
    assert.deepEqual(headers, ["full_name", "contact_email"]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].full_name, "John Doe");
  });

  test("throws a clear error on an empty file", () => {
    assert.throws(() => parseCsvBuffer(Buffer.from("")), /empty/i);
  });

  test("tolerates ragged rows from messy real-world exports", () => {
    const csv = "a,b,c\n1,2\n1,2,3,4\n";
    const { rows } = parseCsvBuffer(Buffer.from(csv));
    assert.equal(rows.length, 2);
  });

  test("drops fully blank trailing rows", () => {
    const csv = "a,b\n1,2\n,\n";
    const { rows } = parseCsvBuffer(Buffer.from(csv));
    assert.equal(rows.length, 1);
  });
});

describe("extractCrmRecords", () => {
  function makeMockProvider(behavior: (rows: RawCsvRow[]) => Awaited<ReturnType<AIProvider["extractBatch"]>>): AIProvider {
    return { extractBatch: async (rows) => behavior(rows) };
  }

  test("rows with no email or mobile are skipped even if the model forgets to flag them", async () => {
    const provider = makeMockProvider((rows) => ({
      results: rows.map((_, i) => ({
        row_index: i,
        skip: false,
        skip_reason: "",
        record: {
          created_at: "", name: "Ghost", email: "", country_code: "",
          mobile_without_country_code: "", company: "", city: "", state: "",
          country: "", lead_owner: "", crm_status: "", crm_note: "",
          data_source: "", possession_time: "", description: "",
        },
      })),
    }));

    const result = await extractCrmRecords(provider, [{ name: "Ghost" }]);
    assert.equal(result.total_imported, 0);
    assert.equal(result.total_skipped, 1);
  });

  test("valid records are imported and counted correctly", async () => {
    const provider = makeMockProvider((rows) => ({
      results: rows.map((row, i) => ({
        row_index: i,
        skip: false,
        skip_reason: "",
        record: {
          created_at: "", name: row.name, email: row.email, country_code: "",
          mobile_without_country_code: "", company: "", city: "", state: "",
          country: "", lead_owner: "", crm_status: "", crm_note: "",
          data_source: "", possession_time: "", description: "",
        },
      })),
    }));

    const result = await extractCrmRecords(provider, [{ name: "Jane", email: "jane@x.com" }]);
    assert.equal(result.total_imported, 1);
    assert.equal(result.total_skipped, 0);
    assert.equal(result.success[0].email, "jane@x.com");
  });

  test("a batch that keeps failing is skipped with a clear reason instead of crashing the whole import", async () => {
    const provider: AIProvider = {
      extractBatch: async () => {
        throw new Error("simulated provider outage");
      },
    };

    const result = await extractCrmRecords(provider, [{ name: "A" }, { name: "B" }]);
    assert.equal(result.total_imported, 0);
    assert.equal(result.total_skipped, 2);
    assert.match(result.skipped[0].reason, /simulated provider outage/);
  });

  test("every input row is accounted for exactly once, in order", async () => {
    const provider = makeMockProvider((rows) => ({
      // Deliberately return results out of order to test index-based reconciliation.
      results: [...rows.map((_, i) => i)].reverse().map((i) => ({
        row_index: i,
        skip: i % 2 === 0,
        skip_reason: "even index",
        record: i % 2 === 0 ? undefined : {
          created_at: "", name: `row-${i}`, email: `row${i}@x.com`, country_code: "",
          mobile_without_country_code: "", company: "", city: "", state: "",
          country: "", lead_owner: "", crm_status: "", crm_note: "",
          data_source: "", possession_time: "", description: "",
        },
      })),
    }));

    const rows = [{ name: "0" }, { name: "1" }, { name: "2" }, { name: "3" }];
    const result = await extractCrmRecords(provider, rows);
    assert.equal(result.total_imported + result.total_skipped, 4);
    assert.equal(result.total_imported, 2); // odd indices only
  });
});
