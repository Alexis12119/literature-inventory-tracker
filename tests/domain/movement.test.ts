import { describe, expect, it } from "vitest";
import { calculateMoved, resolveOpening } from "@/src/lib/domain/movement";

describe("calculateMoved", () => {
  it("returns blank when physical count is blank", () => {
    expect(calculateMoved(10, 3, null)).toBeNull();
    expect(calculateMoved(0, 0, null)).toBeNull();
    expect(calculateMoved(null, 5, null)).toBeNull();
  });

  it("returns zero when both opening and count are zero (received ignored per formula)", () => {
    expect(calculateMoved(0, null, 0)).toBe(0);
    expect(calculateMoved(0, 0, 0)).toBe(0);
    // Spreadsheet OR() only tests H and E, so received does not trigger the calc branch.
    expect(calculateMoved(0, 5, 0)).toBe(0);
  });

  it("computes opening + received - count", () => {
    expect(calculateMoved(10, 3, 8)).toBe(5);
    expect(calculateMoved(10, null, 8)).toBe(2);
    expect(calculateMoved(5, 0, 0)).toBe(5);
  });

  it("preserves negative movement (no clamping)", () => {
    expect(calculateMoved(2, 0, 5)).toBe(-3);
    expect(calculateMoved(0, 1, 5)).toBe(-4);
  });

  it("treats blank opening/received as 0 once a count is entered (spreadsheet ADD)", () => {
    expect(calculateMoved(null, 2, 4)).toBe(-2);
    expect(calculateMoved(null, null, 4)).toBe(-4);
    expect(calculateMoved(10, null, 7)).toBe(3);
    // Blank count still gates: nothing entered, nothing computed.
    expect(calculateMoved(null, 5, null)).toBeNull();
  });

  it("never converts blank received into stored zero (treats as 0 addend only)", () => {
    expect(calculateMoved(10, null, 10)).toBe(0);
    expect(calculateMoved(10, null, 7)).toBe(3);
  });
});

describe("resolveOpening", () => {
  it("uses Originally on Hand for the first month", () => {
    expect(
      resolveOpening({ isFirstMonth: true, originalOnHand: 12, previousOnHand: 99 }),
    ).toBe(12);
  });

  it("carries forward previous count for later months", () => {
    expect(
      resolveOpening({ isFirstMonth: false, originalOnHand: 12, previousOnHand: 7 }),
    ).toBe(7);
  });

  it("propagates missing data as unknown at cycle boundaries", () => {
    expect(
      resolveOpening({ isFirstMonth: true, originalOnHand: null, previousOnHand: 7 }),
    ).toBeNull();
    expect(
      resolveOpening({ isFirstMonth: false, originalOnHand: 12, previousOnHand: null }),
    ).toBeNull();
  });

  it("resolves blank openings to 0 through the movement calc", () => {
    const opening = resolveOpening({ isFirstMonth: false, originalOnHand: 12, previousOnHand: null });
    expect(calculateMoved(opening, 3, 5)).toBe(-2);
  });
});
