import { describe, expect, it } from "vitest";
import {
  resolveRows,
  resolveSections,
  sectionCounts,
  validateSectionName,
  type CatalogCustom,
} from "@/src/features/catalog/store";

const BLANK: CatalogCustom = {
  renames: {},
  hidden: [],
  customs: [],
  local: [],
  overrides: {},
  archived: [],
};

describe("catalog categories", () => {
  it("resolves template sections in order", () => {
    const sections = resolveSections(BLANK);
    expect(sections[0]).toBe("Bibles");
    expect(sections).toContain("Public Magazines");
    expect(sections).toHaveLength(6);
  });

  it("renames a section everywhere except its identity", () => {
    const rows = resolveRows({ ...BLANK, renames: { Books: "Booklets" } });
    expect(rows.filter((r) => r.section === "Booklets").length).toBeGreaterThan(0);
    expect(rows.some((r) => r.section === "Books")).toBe(false);
    // Storage keys keep the original section so saved inventory survives.
    expect(rows.find((r) => r.section === "Booklets")!.key).toContain("Books::");
    expect(resolveSections({ ...BLANK, renames: { Books: "Booklets" } })).toContain("Booklets");
  });

  it("hides sections but keeps their data keys", () => {
    const rows = resolveRows({ ...BLANK, hidden: ["Books"] });
    expect(rows.some((r) => r.section === "Books")).toBe(false);
    expect(rows.length).toBeGreaterThan(0);
  });

  it("adds custom sections and local publications under them", () => {
    const custom: CatalogCustom = {
      ...BLANK,
      customs: ["Special Items"],
      local: [{ itemNo: "9001", name: "Test Tract", code: "tt", section: "Special Items", archived: false }],
    };
    expect(resolveSections(custom)).toContain("Special Items");
    const rows = resolveRows(custom);
    const added = rows.find((r) => r.name === "Test Tract");
    expect(added).toMatchObject({ section: "Special Items" });
    expect(sectionCounts(rows)["Special Items"]).toBe(1);
  });

  it("applies catalog overrides without changing keys", () => {
    const rows = resolveRows({
      ...BLANK,
      overrides: {
        "Books::5414::Ministry School": { itemNo: "5414", name: "Ministry School (rev)", code: "be", section: "Books" },
      },
    });
    const edited = rows.find((r) => r.key === "Books::5414::Ministry School");
    expect(edited?.name).toBe("Ministry School (rev)");
  });

  it("validates category names", () => {
    expect(validateSectionName(BLANK, "")).toMatch(/Enter a category/);
    expect(validateSectionName(BLANK, "books")).toMatch(/already exists/);
    expect(validateSectionName(BLANK, "  BOOKS  ")).toMatch(/already exists/);
    expect(validateSectionName(BLANK, "Booklets")).toBeNull();
    // Renaming onto itself is fine.
    expect(validateSectionName(BLANK, "Books", "Books")).toBeNull();
  });
});
