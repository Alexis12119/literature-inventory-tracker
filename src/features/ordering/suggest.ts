import { CATALOG, MONTH_GROUPS } from "@/src/lib/reports/template";
import { calculateMoved, type Quantity } from "@/src/lib/domain/movement";
import { pubKey, type InventoryGrid } from "@/src/features/inventory/store";

export const CAMPAIGN_CODE = "llfi"; // Enjoy Life Forever! brochure
export const DEFAULT_CAMPAIGN_QTY = 3000;
export const DEFAULT_LEAD_TIME_MONTHS = 3;
export const HISTORY_MONTHS = 3;

export interface SuggestOptions {
  /** Expected delivery lag in months (usually 2–3; adjustable). */
  leadTimeMonths: number;
  /** True when ordering for the September slot (first group of a Sep–Feb cycle). */
  isCampaignMonth: boolean;
  campaignCode?: string;
  campaignQty?: number;
}

export interface OrderSuggestion {
  key: string;
  name: string;
  itemNo: string | null;
  code: string | null;
  section: string;
  /** Mean monthly movement over the trailing counted months. */
  avgMoved: number;
  monthsAveraged: number;
  latestOnHand: number;
  /** Latest stock ÷ avg demand; null when there is no positive demand signal. */
  monthsOfCover: number | null;
  suggested: number;
  reasons: Array<"campaign" | "reorder" | "covered">;
}

/**
 * How much to order now so stock lasts through the delivery lead time.
 *
 * base = ceil(avgMonthlyMoved × leadTime − latestOnHand), floored at 0.
 * September campaign: the campaign item is topped up to `campaignQty`
 * (default 3000) regardless of the formula — the congregation burns
 * through it during the campaign month.
 *
 * Only publications with at least one counted month are suggested;
 * blank history never invents demand.
 */
export function suggestOrders(
  grid: InventoryGrid,
  opts: SuggestOptions,
  carried: Record<string, Quantity> = {},
): OrderSuggestion[] {
  const campaignCode = (opts.campaignCode ?? CAMPAIGN_CODE).toLowerCase();
  const campaignQty = opts.campaignQty ?? DEFAULT_CAMPAIGN_QTY;
  const out: OrderSuggestion[] = [];

  for (const r of CATALOG) {
    const key = pubKey(r.section, r.itemNo, r.name);
    const trailing: number[] = [];
    let latestOnHand: number | null = null;

    for (let mi = MONTH_GROUPS.length - 1; mi >= 0 && trailing.length < HISTORY_MONTHS; mi--) {
      const m = MONTH_GROUPS[mi];
      const cell = grid.months[key]?.[m];
      if (!cell || cell.onHand === null) continue;
      if (latestOnHand === null) latestOnHand = cell.onHand;
      const opening =
        mi === 0
          ? (grid.original[key] ?? carried[key] ?? null)
          : (grid.months[key]?.[MONTH_GROUPS[mi - 1]]?.onHand ?? null);
      trailing.push(calculateMoved(opening, cell.received, cell.onHand) ?? 0);
    }
    if (latestOnHand === null || trailing.length === 0) continue;

    const avgMoved = trailing.reduce((a, b) => a + b, 0) / trailing.length;
    const base = Math.max(0, Math.ceil(avgMoved * opts.leadTimeMonths - latestOnHand));
    let suggested = base;
    const reasons: OrderSuggestion["reasons"] = [];
    if (opts.isCampaignMonth && (r.code ?? "").toLowerCase() === campaignCode) {
      suggested = Math.max(suggested, Math.max(0, campaignQty - latestOnHand));
      reasons.push("campaign");
    }
    const monthsOfCover = avgMoved > 0 ? latestOnHand / avgMoved : null;
    if (suggested > 0) reasons.push("reorder");
    else reasons.push("covered");

    out.push({
      key,
      name: r.name,
      itemNo: r.itemNo,
      code: r.code,
      section: r.section,
      avgMoved: Math.round(avgMoved * 10) / 10,
      monthsAveraged: trailing.length,
      latestOnHand,
      monthsOfCover: monthsOfCover === null ? null : Math.round(monthsOfCover * 10) / 10,
      suggested,
      reasons,
    });
  }

  return out.sort((a, b) => b.suggested - a.suggested || b.avgMoved - a.avgMoved);
}
