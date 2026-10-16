/**
 * Report template constants — wording must match
 * monthly_movement_report_exact_spec.md verbatim.
 * Quantities are NEVER stored here; only labels and publication rows.
 */

export const REPORT_TITLE = "MONTHLY MOVEMENT OF LITERATURE";
export const INSTRUCTIONS_HEADING = "INSTRUCTIONS:";

export const INSTRUCTIONS_PARAGRAPHS: string[] = [
  "1. Language-coordinating congregations take an actual count of literature each month, and the quantity is entered in the \u201cCurrently on Hand\u201d column.",
  "2. \u201cRec\u2019d\u201d column: Post the quantity of each item received.",
  "3. \u201cMoved\u201d column: Post the quantity of each item moved. This can be determined by (1) adding together what was received during the month with what was on hand from the previous month and then (2) subtracting from this total the number of the actual count just taken (\u201cCurrently on Hand\u201d).",
  "4. With the exception of the Organized book, special-request items are not listed on this report, since they should not be kept in stock. If for some reason special-request items are on hand, post the quantities in one of the general categories, such as \u201cOther Bibles.\u201d",
];

/**
 * Instruction 5 renders as an intro paragraph followed by four bulleted
 * actions, matching the source form's ● layout. Wording is unchanged —
 * the original single paragraph is only split at its (1)–(4) boundaries.
 */
export const INSTRUCTION_5_INTRO =
  "5. Twice a year, the branch office will ask language-coordinating congregations to submit their inventory reports via JW Hub. When doing so, the following actions should be taken by the literature servant:";

export const INSTRUCTION_5_BULLETS: string[] = [
  "(1) Prior to submitting the inventory report, please review the List of Publications Approved for Discard (S-60) and follow the instructions to discard any items appearing in the list.",
  "(2) Record the inventory count on the latest version of the Monthly Movement of Literature (S-28) form. Include any literature stored on public witnessing carts.",
  "(3) Submit the inventory report via JW Hub. On the JW Hub home page, select \u201cLiterature,\u201d then select \u201cInventory Reports.\u201d An inventory report should be submitted for each language displayed.",
  "(4) Determine how much literature can be shared with nearby congregations. On the JW Hub home page, select \u201cLiterature,\u201d then \u201cInventory Reports,\u201d and then \u201cMaintain Current Inventory.\u201d Update the \u201cQuantity to Share\u201d column.",
];

export const FIXED_COLUMNS = ["Item No.", "Name", "Originally on Hand"] as const;

export const MONTH_GROUPS = [
  "Sep/Mar",
  "Oct/Apr",
  "Nov/May",
  "Dec/June",
  "Jan/July",
  "Feb/Aug",
] as const;

export const MONTH_SUBCOLUMNS = ["Rec'd", "Currently on Hand", "Moved"] as const;

export type MonthGroup = (typeof MONTH_GROUPS)[number];

export function languageLabel(code: "en" | "tl"): string {
  return code === "tl" ? "LANGUAGE: TAGALOG" : "LANGUAGE: ENGLISH";
}

export function monthYearLine(month: string, year: string | number): string {
  return `Month & Year: ${month}, ${year}`;
}

/** Total logical columns: 3 fixed + 6 groups x 3 = 21. */
export function totalReportColumns(): number {
  return FIXED_COLUMNS.length + MONTH_GROUPS.length * MONTH_SUBCOLUMNS.length;
}

export interface CatalogRow {
  section: string;
  itemNo: string | null;
  name: string;
  code: string | null;
  isSectionHeader?: boolean;
}

function row(section: string, itemNo: string | null, name: string, code: string | null): CatalogRow {
  return { section, itemNo, name, code };
}

// Source spellings preserved exactly (e.g. "Isaiah's Propechy I").
const RAW: Array<[string, string | null, string, string | null]> = [
  ["Bibles", "5140", "New World Translation", "nwt"],
  ["Bibles", "5142", "New World Translation (pocket size)", "nwtpkt"],
  ["Bibles", "5100", "Other Bibles", null],
  ["Teaching Toolbox", "7305", "Invitation to congregation meetings", "inv"],
  ["Teaching Toolbox", "8410", "Contact card (picture of open Bible)", "jwcd1"],
  ["Teaching Toolbox", "8524", "Contact Card (jw.org logo only)", "jwcd4"],
  ["Teaching Toolbox", "8569", "Contact Card (in-person Bible course)", "jwcd9"],
  ["Teaching Toolbox", "8570", "Contact Card (virtual Bible course)", "jwcd10"],
  ["Teaching Toolbox", "5445", "Enjoy Life Forever!", "llf"],
  ["Teaching Toolbox", "65445", "Enjoy Life Forever! brochure", "llfi"],
  ["Teaching Toolbox", "6657", "Listen and Live", "ll"],
  ["Teaching Toolbox", "7130", "View the Bible", "T-30"],
  ["Teaching Toolbox", "7131", "View the Future", "T-31"],
  ["Teaching Toolbox", "7132", "Happy Family Life", "T-32"],
  ["Teaching Toolbox", "7133", "Who Controls the World?", "T-33"],
  ["Teaching Toolbox", "7134", "Will Suffering End?", "T-34"],
  ["Teaching Toolbox", "7135", "Live Again", "T-35"],
  ["Teaching Toolbox", "7136", "Kingdom", "T-36"],
  ["Teaching Toolbox", "7137", "Website Tract", "T-37"],
  ["Books", "5414", "Ministry School", "be"],
  ["Books", "5340", "Teach Us", "bhs"],
  ["Books", "5416", "Bearing Witness", "bt"],
  ["Books", "5231", '"My Follower"', "cf"],
  ["Books", "5331", "Close to Jehovah", "cl"],
  ["Books", "5227", "Family Happiness", "fy"],
  ["Books", "5419", "Imitate", "ia"],
  ["Books", "5329", "Isaiah's Propechy I", "ip-1"],
  ["Books", "5330", "Isaiah's Propechy II", "ip-2"],
  ["Books", "5232", "Jeremiah", "jr"],
  ["Books", "5425", "Jesus-The Way", "jy"],
  ["Books", "5422", "God's Kingdom Rules!", "kr"],
  ["Books", "5427", "Learn From the Bible", "lfb"],
  ["Books", "5415", "Teacher", "lr"],
  ["Books", "5343", "Remain in God's Love", "lvs"],
  ["Books", "5332", "Organized", "od"],
  ["Books", "5435", "Pure Worship", "rr"],
  ["Books", "5341", '"Sing Out Joyfully"', "sjj"],
  ["Books", "5441", '"Sing Out Joyfully" (large size)', "sjjs"],
  ["Books", "5442", '"Sing Out Joyfully"-Lyrics Only', "sjjyls"],
  ["Books", "5339", "Young People Ask, Volume 1", "yp1"],
  ["Books", "5336", "Young People Ask, Volume 2", "yp2"],
  ["Books", "5200", "Other books", null],
  ["Brochures and Booklets", "6618", "Reading and Writing", "ay"],
  ["Brochures and Booklets", "6652", "Bible's Message", "bm"],
  ["Brochures and Booklets", "6638", "Education", "ed"],
  ["Brochures and Booklets", "6659", "Good News", "fg"],
  ["Brochures and Booklets", "6645", "God's Friend", "gf"],
  ["Brochures and Booklets", "6665", "Happy Family", "hf"],
  ["Brochures and Booklets", "6662", "Happy Life", "hl"],
  ["Brochures and Booklets", "6660", "Jehovah's Will", "jl"],
  ["Brochures and Booklets", "6647", "Satisfying Life", "la"],
  ["Brochures and Booklets", "6654", "Was Life Created?", "lc"],
  ["Brochures and Booklets", "6658", "Listen to God", "ld"],
  ["Brochures and Booklets", "6655", "Origin of Life", "lf"],
  ["Brochures and Booklets", "6663", "My Bible Lessons", "mb"],
  ["Brochures and Booklets", "6648", "Road to Life", "ol"],
  ["Brochures and Booklets", "6639", "Lasting Peace", "pc"],
  ["Brochures and Booklets", "6653", "Pathway", "ph"],
  ["Brochures and Booklets", "6671", "Return to Jehovah", "rj"],
  ["Brochures and Booklets", "6656", "Real Faith", "rk"],
  ["Brochures and Booklets", "6630", "Spirits of the Dead", "sp"],
  ["Brochures and Booklets", "6667", "Teaching", "th"],
  ["Brochures and Booklets", "6670", "Wisdom From the Gospels", "wfg"],
  ["Brochures and Booklets", "6635", "Why Worship God", "wj"],
  ["Brochures and Booklets", "6664", "Teach Your Children", "yc"],
  ["Brochures and Booklets", "6684", "10 Questions", "ypq"],
  ["Brochures and Booklets", "6600", "Other brochures and booklets", null],
  ["Forms (1 inch = 300)", "8724", "Transaction Record", "S-24"],
  ["Forms (1 inch = 300)", "8704", "Field Service Report", "S-4"],
  ["Forms (1 inch = 300)", "8708", "House-to-House Record", "S-8"],
  ["Public Magazines", null, "Awake! No.1 2018", "g18.1"],
  ["Public Magazines", null, "Awake! No.2 2018", "g18.2"],
  ["Public Magazines", null, "Awake! No.3 2018", "g18.3"],
  ["Public Magazines", null, "Awake! No.1 2019", "g19.1"],
  ["Public Magazines", null, "Awake! No.2 2019", "g19.2"],
  ["Public Magazines", null, "Awake! No.3 2019", "g19.3"],
  ["Public Magazines", null, "Awake! No.1 2020", "g20.1"],
  ["Public Magazines", null, "Awake! No.2 2020", "g20.2"],
  ["Public Magazines", null, "Awake! No.3 2020", "g20.3"],
  ["Public Magazines", null, "Awake! No.1 2021", "g21.1"],
  ["Public Magazines", null, "Awake! No.2 2021", "g21.2"],
  ["Public Magazines", null, "Awake! No.3 2021", "g21.3"],
  ["Public Magazines", null, "Awake! No.1 2022", "g22.1"],
  ["Public Magazines", null, "Watchtower No.1 2018", "wp18.1"],
  ["Public Magazines", null, "Watchtower No.2 2018", "wp18.2"],
  ["Public Magazines", null, "Watchtower No.3 2018", "wp18.3"],
  ["Public Magazines", null, "Watchtower No.1 2019", "wp19.1"],
  ["Public Magazines", null, "Watchtower No.2 2019", "wp19.2"],
  ["Public Magazines", null, "Watchtower No.3 2019", "wp19.3"],
  ["Public Magazines", null, "Watchtower No.1 2020", "wp20.1"],
  ["Public Magazines", null, "Watchtower No.2 2020", "wp20.2"],
  ["Public Magazines", null, "Watchtower No.3 2020", "wp20.3"],
  ["Public Magazines", null, "Watchtower No.1 2021", "wp21.1"],
  ["Public Magazines", null, "Watchtower No.2 2021", "wp21.2"],
  ["Public Magazines", null, "Watchtower No.3 2021", "wp21.3"],
  ["Public Magazines", null, "Watchtower No.1 2022", "wp22.1"],
  ["Public Magazines", null, "All other public magazines", null],
];

export const SECTIONS = [
  "Bibles",
  "Teaching Toolbox",
  "Books",
  "Brochures and Booklets",
  "Forms (1 inch = 300)",
  "Public Magazines",
] as const;

export const CATALOG: CatalogRow[] = RAW.map(([section, itemNo, name, code]) =>
  row(section, itemNo, name, code),
);
