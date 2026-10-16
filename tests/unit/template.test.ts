import { describe, expect, it } from "vitest";
import { buildDisplayName } from "@/src/lib/domain/display-name";
import { inventoryEntrySchema, registrationSchema } from "@/src/lib/validation/inventory";
import {
  CATALOG,
  FIXED_COLUMNS,
  INSTRUCTIONS_PARAGRAPHS,
  INSTRUCTION_5_BULLETS,
  INSTRUCTION_5_INTRO,
  MONTH_GROUPS,
  MONTH_SUBCOLUMNS,
  SECTIONS,
  languageLabel,
  monthYearLine,
  totalReportColumns,
} from "@/src/lib/reports/template";

describe("buildDisplayName", () => {
  it("combines first and last name", () => {
    expect(buildDisplayName({ first_name: "Juan", last_name: "Dela Cruz" })).toBe(
      "Juan Dela Cruz",
    );
  });

  it("includes middle name when present", () => {
    expect(
      buildDisplayName({ first_name: "Maria", middle_name: "Santos", last_name: "Reyes" }),
    ).toBe("Maria Santos Reyes");
  });

  it("omits blank middle name and preserves punctuation", () => {
    expect(
      buildDisplayName({ first_name: "Anne-Marie", middle_name: null, last_name: "O'Brien" }),
    ).toBe("Anne-Marie O'Brien");
  });
});

describe("inventoryEntrySchema", () => {
  it("preserves blank as null and zero as zero", () => {
    const parsed = inventoryEntrySchema.parse({
      publicationId: "p1",
      monthId: "m1",
      received: "",
      onHand: 0,
    });
    expect(parsed.received).toBeNull();
    expect(parsed.onHand).toBe(0);
  });

  it("rejects negative quantities", () => {
    expect(() =>
      inventoryEntrySchema.parse({ publicationId: "p1", monthId: "m1", received: -1, onHand: null }),
    ).toThrow();
  });

  it("rejects password mismatch on registration", () => {
    const bad = {
      firstName: "Juan",
      lastName: "Cruz",
      email: "juan@example.com",
      password: "password123",
      confirmPassword: "different123",
    };
    expect(() => registrationSchema.parse(bad)).toThrow(/Passwords do not match/);
  });
});

describe("report template", () => {
  it("has 21 logical columns in the required order", () => {
    expect(totalReportColumns()).toBe(21);
    expect([...FIXED_COLUMNS]).toEqual(["Item No.", "Name", "Originally on Hand"]);
    expect([...MONTH_GROUPS]).toEqual([
      "Sep/Mar",
      "Oct/Apr",
      "Nov/May",
      "Dec/June",
      "Jan/July",
      "Feb/Aug",
    ]);
    expect([...MONTH_SUBCOLUMNS]).toEqual(["Rec'd", "Currently on Hand", "Moved"]);
  });

  it("keeps section order and source spellings", () => {
    expect([...SECTIONS]).toEqual([
      "Bibles",
      "Teaching Toolbox",
      "Books",
      "Brochures and Booklets",
      "Forms (1 inch = 300)",
      "Public Magazines",
    ]);
    const names = CATALOG.map((r) => r.name);
    expect(names).toContain("Isaiah's Propechy I");
    expect(names).toContain("Isaiah's Propechy II");
    expect(names).toContain("Enjoy Life Forever! brochure");
    // Magazine rows carry no item number and keep listed order
    const mags = CATALOG.filter((r) => r.section === "Public Magazines");
    expect(mags[0]).toMatchObject({ name: "Awake! No.1 2018", itemNo: null });
    expect(mags[mags.length - 1]).toMatchObject({ name: "All other public magazines" });
  });

  it("renders language and month/year labels", () => {
    expect(languageLabel("tl")).toBe("LANGUAGE: TAGALOG");
    expect(languageLabel("en")).toBe("LANGUAGE: ENGLISH");
    expect(monthYearLine("August", 2026)).toBe("Month & Year: August, 2026");
  });

  it("keeps instruction 5 wording intact across intro + four bullets", () => {
    expect(INSTRUCTIONS_PARAGRAPHS).toHaveLength(4);
    expect(INSTRUCTIONS_PARAGRAPHS[0].startsWith("1. ")).toBe(true);
    expect(INSTRUCTION_5_BULLETS).toHaveLength(4);
    expect(INSTRUCTION_5_INTRO.endsWith("literature servant:")).toBe(true);
    const joined = `${INSTRUCTION_5_INTRO} ${INSTRUCTION_5_BULLETS.join(" ")}`;
    expect(joined).toBe(
      "5. Twice a year, the branch office will ask language-coordinating congregations to submit their inventory reports via JW Hub. When doing so, the following actions should be taken by the literature servant: (1) Prior to submitting the inventory report, please review the List of Publications Approved for Discard (S-60) and follow the instructions to discard any items appearing in the list. (2) Record the inventory count on the latest version of the Monthly Movement of Literature (S-28) form. Include any literature stored on public witnessing carts. (3) Submit the inventory report via JW Hub. On the JW Hub home page, select \u201cLiterature,\u201d then select \u201cInventory Reports.\u201d An inventory report should be submitted for each language displayed. (4) Determine how much literature can be shared with nearby congregations. On the JW Hub home page, select \u201cLiterature,\u201d then \u201cInventory Reports,\u201d and then \u201cMaintain Current Inventory.\u201d Update the \u201cQuantity to Share\u201d column.",
    );
  });
});
