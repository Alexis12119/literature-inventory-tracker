/**
 * Single authoritative movement calculation.
 *
 * Spreadsheet source:
 *   =IF(ISBLANK(H10),"",IF(OR(H10>0,E10>0),MINUS(ADD(E10,G10),H10),IF(ISBLANK(H10),"",0)))
 * Mapping: E = opening (previous stock), G = received, H = current physical count.
 *
 * Behavior (spreadsheet + owner exception for untouched opening stock):
 * 1. Blank physical count -> blank (null) in general. Only the count gates
 *    the result.
 * 1a. Owner exception: when opening is present (> 0) and BOTH received and
 *     physical count are blank (untouched), the opening stock is treated as
 *     fully moved (moved = opening). This covers the first-part case where
 *     Originally on Hand has a value but Rec'd / Currently on Hand were
 *     never entered — the stock is assumed distributed, so Moved shows the
 *     opening quantity instead of blank. Stored inputs stay blank; only the
 *     Moved display computes. Explicit zeros still behave as zeros, and any
 *     entered received quantity keeps the blank-count gate (still blank
 *     until counted).
 * 2. Count entered and (count > 0 OR opening > 0) -> opening + received - count.
 * 3. Both count and opening zero (or blank) -> 0.
 * 4. Negatives preserved (no clamping).
 * 5. Blank opening / received act as 0 inside the arithmetic once a count is
 *    entered — the spreadsheet's ADD() coerces blanks, so a blank does NOT
 *    mean "unknown, refuse to compute". Stored inputs still preserve
 *    blank-versus-zero (blank stays blank on screen); only the Moved
 *    calculation coerces. Missing counts remain explicitly flagged by the
 *    missing-entry indicator, never silently filled.
 */

export type Quantity = number | null;

export function calculateMoved(
  opening: Quantity,
  received: Quantity,
  onHand: Quantity,
): Quantity {
  if (onHand === null || onHand === undefined) {
    // Owner exception: untouched opening stock reads as fully moved.
    // Narrow gate — both monthly fields must be blank and opening > 0.
    if (received === null && opening !== null && opening > 0) return opening;
    return null;
  }
  const open = opening ?? 0;
  const recv = received ?? 0;
  if (onHand > 0 || open > 0) {
    return open + recv - onHand;
  }
  return 0;
}

/**
 * Resolve the opening balance for a month in a six-month cycle.
 * First month uses the cycle's Originally on Hand; later months use the
 * previous month's physical count. Either may be null (= blank); the
 * movement calculation coerces blanks to 0 once a count is entered.
 */
export function resolveOpening(params: {
  isFirstMonth: boolean;
  originalOnHand: Quantity;
  previousOnHand: Quantity;
}): Quantity {
  if (params.isFirstMonth) return params.originalOnHand;
  return params.previousOnHand;
}
