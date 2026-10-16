# Reports Page UI and Contents Specification

## 1. Purpose

Adjust the existing Reports page to reproduce the layout and contents of the supplied JW Hub report, titled **MONTHLY MOVEMENT OF LITERATURE**.

The goal is to match the report's content hierarchy, wording, table structure, item grouping, and print layout—not to create a new dashboard design.

## 2. Report Header

Display the following elements in this order:

1. Small contextual label: `Congregation Literature`
2. Centered title: `MONTHLY MOVEMENT OF LITERATURE`
3. Congregation name and identifier, aligned toward the left:
   `San Francisco - San Pablo City LAG (30890)`
4. Reporting month and language:
   `September 2026 | Tagalog`

The congregation example above comes from the application's Settings
(congregation name/number); the date and language come from the selected
reporting month and language. The earlier `Recent Reports Submitted` line was
dropped — submission tracking is deferred to the backend milestone.

## 3. Overall Visual Style

- White background with black or dark text.
- Formal, compact, document-like appearance.
- Simple typography without decorative graphics.
- No colorful dashboard cards, charts, gradients, or illustrations inside the report.
- Clear spacing between the report header and table.
- Thin table borders and consistent alignment.
- Bold section headings separating publication categories.
- Print-friendly layout suitable for PDF export.
- Repeat the table header on subsequent printed pages.

Keep website navigation, filters, and action buttons outside the printable report.

## 4. Table Structure

The report must contain exactly three columns:

| Column heading | Purpose |
|---|---|
| `Item` | Publication code and name |
| `Current Quantity on Hand` | Current inventory quantity |
| `Average Monthly Movement` | Average monthly movement value |

Use the exact column labels shown above. The two numeric headings should wrap onto two lines if necessary to match the source layout.

The `Item` column should occupy most of the available width. The two numeric columns should be narrower and consistently aligned. Long item names may wrap onto a second line.

Do not replace these labels with `Currently on Hand`, `Moved`, or other alternative wording.

## 5. Section Headings and Item Order

Items follow the live application catalog — the same rows as the inventory
workspace, grouped by their current sections — so catalog edits (renames,
new categories, local publications) stay in sync instead of drifting from a
hardcoded list. Display each row as `(code) Name`, or the plain name when a
row has no code.

The original JW Hub PDF listed a fixed subset (Bibles, Books, Brochures and
Booklets, Forms and Supplies, Tracts, Public Magazines with issue-specific
magazine rows). That fixed list is intentionally not hardcoded: the owner
will reconcile the catalog itself, and the report follows it.

Keep repeated magazine names as separate rows because their codes identify different issues.

## 6. Pagination and Printing

The source PDF spans three pages.

- Page 1 contains the report header, metadata, and the beginning of the table.
- Pages 2 and 3 continue the table.
- Repeat the three-column table header on each continuation page.
- Avoid splitting individual item rows across pages.
- Keep section headings with their associated item rows whenever possible.
- Use compact margins and typography to maintain the original document's density.
- Portrait orientation with a fitted table (the Item column dominant).

The report should be printable and exportable to PDF without including the application's navigation or interactive controls.

## 7. Reports Page Controls

The source PDF does not show the interactive website controls. These are the implemented controls for the surrounding Reports page, not elements copied from the PDF:

- Report type switch: Summary | Six-month tracker.
- Reporting cycle selector (with service-year extension).
- Language selector (English | Tagalog).
- Single report-month selector: drives the `Month & Year` label, the year,
  and the exported column. No separate month/year duplication.
- Congregation name/number in Settings (no congregation selector — one
  shared inventory environment).
- Report preview (screen uses the same compact type as the export).
- Custom Download PDF action plus browser Print.

Keep these controls outside the printable report.

## 8. Important Distinction

This is the **Congregation Literature summary report**, which differs from the six-month inventory tracker.

This summary report uses:
- `Item`
- `Current Quantity on Hand`
- `Average Monthly Movement`

It does not contain the six month-pair groups or the `Rec'd`, `Currently on Hand`, and `Moved` columns for each month.

If both report formats are required, implement them as separate report types.

## 9. Instructions for the Coding Agent

Modify the existing Reports page to generate a report matching the supplied JW Hub PDF. Preserve the report title, metadata hierarchy, and exact column headings. Use a compact, monochrome, print-friendly table with repeated headers across pages. Populate quantities and metadata from saved application data rather than hard-coding the PDF's example values. Follow the live catalog for items (owner decision — no hardcoded item list) while keeping the six-month tracker on the official template wording. Do not merge this summary report with the six-month tracker or replace the table with dashboard cards or charts.
