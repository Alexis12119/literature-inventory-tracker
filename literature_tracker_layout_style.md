# Previous Literature Tracker --- Layout and Style Specification

## Purpose of this document

This document describes the appearance, structure, and behavior of the
previous **Monthly Movement of Literature** tracker in words, so an AI
coding agent can reproduce its recognizable layout without needing to
view the original PDF or spreadsheet.

Treat the tracker as a **compact, spreadsheet-like inventory report**,
not as a modern analytics dashboard. The website may use modern controls
for navigation and data entry, but the inventory grid and its
printable/exported report should preserve the original report's
structure and visual character.

This specification is based on the provided Monthly Movement of
Literature samples. The samples include an August 2024 tracker and an
August 2026 report form. Use the samples to understand the layout; do
not copy their historical quantities into the live application as
default data.

## 1. Overall page composition

-   The report is a formal, monochrome document on a plain white page.
-   The report table is very wide and shallow relative to its width. It
    is designed to be read horizontally.
-   The printed version uses a **landscape page orientation** with
    narrow margins so all six month groups fit across the page.
-   The table spans nearly the full usable page width.
-   The visual style is restrained and utilitarian: black text, thin
    black grid lines, white cells, and selected light-gray cells.
-   There are no decorative illustrations, charts, gradients, colorful
    cards, large icons, or ornamental page elements.
-   The report title is centered above the table in uppercase, bold
    serif-style lettering in the source document.
-   In the instruction version, a block of numbered instructions appears
    above the inventory grid. The language label is aligned toward the
    upper-right side of that instruction area.
-   In the tracker-only sample, the instruction block is absent, leaving
    the title and grid as the main content.

## 2. Report heading and metadata

At the top of the report, show the centered title:

**MONTHLY MOVEMENT OF LITERATURE**

Immediately above or at the beginning of the table, show a compact
metadata row: - Left side: `Month & Year: [Month, Year]` - In the
instruction/report form, show `LANGUAGE: ENGLISH` or the relevant
language near the instruction heading area. - Keep this information
small and functional. It should not look like a large marketing-style
page heading.

For the web application, the user should choose a reporting period and
language through normal form controls. In the print/export layout,
render those selected values as plain report text in the same general
position as the source form.

## 3. Main table: fixed left columns

The table begins with three identifying columns before the repeated
monthly columns:

1.  **Item No.** --- narrow column containing a publication/item number
    when one exists.
2.  **Name** --- the widest descriptive column. It contains the
    publication name and, where applicable, a short abbreviation or
    publication code.
3.  **Originally on Hand** --- a narrow numeric column containing the
    initial inventory quantity for the six-month reporting sequence.

The item number and name are aligned to the left. Numeric quantities are
centered or compactly aligned within narrow cells. Keep the item name
column substantially wider than each numeric column so long publication
names can fit on one or two lines.

Some rows have no visible item number. Category headings also occupy the
name area without being ordinary inventory items.

## 4. Six paired reporting-period groups

After the fixed identifying columns, the table contains **six repeated
month-pair groups**, in this exact order:

1.  `Sep/Mar`
2.  `Oct/Apr`
3.  `Nov/May`
4.  `Dec/June`
5.  `Jan/July`
6.  `Feb/Aug`

Each group contains three subcolumns, always in this order:

-   `Rec'd`
-   `Currently on Hand`
-   `Moved`

The first group is preceded by the `Originally on Hand` column. Each
monthly group has a short group heading centered above its three
subcolumns. The labels are compact and may wrap onto multiple lines
because the columns are narrow. Preserve the meaning and order even if a
responsive web view presents only one month at a time.

### Approximate table column sequence

`Item No. | Name | Originally on Hand | Sep/Mar: Rec'd | Currently on Hand | Moved | Oct/Apr: Rec'd | Currently on Hand | Moved | ... | Feb/Aug: Rec'd | Currently on Hand | Moved`

The six groups therefore produce eighteen monthly data subcolumns, in
addition to the three identifying columns.

## 5. Cell borders, shading, and visual hierarchy

-   Use a clear rectangular grid with thin black borders around
    individual cells.
-   Use slightly stronger borders to distinguish the table's outer edge
    and the header/group boundaries.
-   Keep most cells white.
-   The **Moved** column is shaded light gray in the source tracker.
    Repeat that shading for the Moved subcolumn in each of the six
    monthly groups, including the full column down through the body
    rows. This is an important visual cue and should be preserved in the
    printable report.
-   Do not use saturated colors. Gray shading should remain pale enough
    for black numbers to be easy to read.
-   The top header has multiple levels: the month-pair heading, then the
    three subcolumn labels. Use centered text and compact line spacing.
-   The table is dense. Rows are relatively short, with thin horizontal
    rules separating each item.
-   Category divider rows use bold text in the Name column and visually
    separate publication groups. They are not ordinary data-entry rows.
-   Avoid excessive padding inside numeric cells; compactness is
    necessary to fit the full six-month table on a landscape page.

## 6. Category rows and publication ordering

The tracker groups inventory items into named sections. The supplied
English sample includes these category headings, in this general order:

1.  **Bibles**
2.  **Teaching Toolbox**
3.  **Books**
4.  **Brochures and Booklets**
5.  **Forms (1 inch = 300)**
6.  **Public Magazines**

Under each heading, list its publications as individual rows. The
section label is visually distinct from the item rows, typically bold
and positioned in the Name area. Some section labels do not have an item
number or quantities.

Examples of the types of entries visible in the sample include Bible
editions, contact cards, teaching-toolbox publications, books,
brochures/booklets, forms, and individual issue-specific magazine rows.
Magazine rows include issue/year names and compact codes such as `g19.1`
or `wp21.1`.

Keep publications as individual records/rows, not as hard-coded database
columns. The website should support adding, retiring, or reordering
publication rows without changing the database schema. A
language-specific inventory should display its relevant publication
list.

Do not treat the sample's historical publication names, item numbers, or
quantities as a complete permanent catalogue. The original form may be
updated over time.

## 7. Text treatment and density

-   Use a small, legible font in the table. The source document uses a
    formal, office-form appearance rather than a contemporary oversized
    interface.
-   The title is uppercase and bold.
-   Column group labels and column labels are compact, centered, and may
    wrap.
-   Category names are bold.
-   Publication names are regular weight.
-   Item numbers, abbreviations, and quantities should remain easy to
    distinguish at a glance.
-   Keep the report black-and-white friendly for printing and
    photocopying.
-   Long names may wrap within the Name column. Avoid clipping text or
    allowing it to overlap neighboring cells.

## 8. How users read and enter inventory

The source tracker is a monthly stock movement table. For each
publication row and month:

-   `Rec'd` is the quantity received during that month.
-   `Currently on Hand` is the result of the actual physical count for
    that month.
-   `Moved` is calculated from the previous stock plus the quantity
    received during the month, minus the actual current count.

The table should distinguish a blank/unentered count from an explicit
quantity of zero. Do not silently convert a missing physical count into
zero.

The `Originally on Hand` column records the initial stock quantity for
the six-month sequence. For subsequent months, the previous month's
closing count is the opening stock used for the movement calculation.

## 9. English and Tagalog reports

The supplied materials show English and Tagalog as separate language
reports. Keep the overall structure consistent between languages:

-   Separate inventory data by language.
-   Use the same six paired reporting-period groups.
-   Keep the same three monthly subcolumns and the same fixed
    identifying columns.
-   Keep the same grid style, light-gray Moved columns, compact
    typography, and landscape print layout.
-   Allow publication names and abbreviations to vary by language.
-   Display the correct selected language in the report metadata.

Do not merge English and Tagalog stock quantities into a single
inventory row or total unless the user explicitly requests a separate
cross-language summary.

## 10. Instructions page variant

One supplied version includes an instruction block above the table. If
the website offers an instruction/report print option, style the
instructions as a compact numbered list above the grid rather than as
cards.

The source instruction topics are: 1. Perform an actual count each month
and enter it in `Currently on Hand`. 2. Enter quantities received in
`Rec'd`. 3. Calculate `Moved` as previous stock plus received quantity
minus the actual count. 4. Special-request items are generally not
listed, except the Organized book; if such items are on hand, the source
instructions say to report them under a general category such as
`Other Bibles`. 5. For twice-yearly reporting, the source instructions
reference reviewing the S-60 List of Publications Approved for Discard,
using the latest S-28 form and including literature on public witnessing
carts, submitting inventory reports via JW Hub for each language, and
maintaining the quantity-to-share information in JW Hub.

If these instructions are included in the app, preserve them as
informational guidance. Do not imply that this website replaces JW Hub
or automatically submits information to JW Hub.

## 11. Website layout recommendations that preserve the original

The web application can be more usable than a printed sheet while
retaining the tracker's recognizable design.

### Desktop inventory screen

-   Use a clean white or near-white workspace.
-   Keep the publication identity columns fixed or sticky on the left
    when horizontally scrolling, if technically practical.
-   Keep month-pair groups visually distinct with grouped column
    headers.
-   Use compact rectangular cells, subtle neutral borders, and pale gray
    Moved columns.
-   Align quantities consistently and make editable numeric fields
    visually clear without making the table look like a colorful
    spreadsheet.
-   Provide a visible reporting-period selector and language selector
    above the table.
-   Use horizontal scrolling for the full six-month grid instead of
    shrinking text to an unreadable size.

### Mobile inventory screen

-   Do not squeeze all eighteen monthly subcolumns onto a phone screen.
-   Keep publication name and item number easy to identify.
-   Let the user select one month-pair period and show only that
    period's `Rec'd`, `Currently on Hand`, and `Moved` fields alongside
    the publication.
-   Use compact row cards or a simplified list on small screens, but
    retain the same labels and data meanings.
-   Make quantity fields comfortable to tap and edit.

### Print and export

-   Provide a report/print view that closely follows the source layout.
-   Use landscape orientation, compact margins, a centered uppercase
    title, month/year metadata, fixed identifying columns, six
    month-pair groups, thin grid lines, and light-gray Moved columns.
-   Repeat the table header if the table spans multiple printed pages.
-   Keep a category row with its associated items when possible; avoid
    orphaned section headings at the bottom of a page.
-   Use black text on white backgrounds and printer-friendly gray
    shading.
-   The report should be readable when exported to PDF or printed. A
    screen-optimized table does not need to use exactly the same layout
    as the mobile screen.

## 12. Important implementation boundaries

-   Reproduce the **structure and visual hierarchy**, not the exact
    historical data in the samples.
-   Do not add decorative charts or replace the inventory grid with
    summary cards as the primary report.
-   Do not turn each month into a separate page in the desktop/print
    report; the source's defining feature is the six groups displayed
    side by side.
-   Do not remove the Moved columns or their light-gray emphasis.
-   Do not combine the Rec'd, Currently on Hand, and Moved fields into a
    single monthly value.
-   Do not treat category headings as inventory items.
-   Keep the English and Tagalog inventories separate.
-   Keep the table data model dynamic, with publication rows and
    reporting periods stored as records.
-   If a specific visual detail is not described here, prefer a
    restrained black-and-white office-form aesthetic consistent with the
    source, rather than inventing a colorful new design.

## 13. Short instruction for the coding agent

Build the tracker so it feels like a faithful digital version of the
previous Monthly Movement of Literature spreadsheet: a dense,
monochrome, landscape-style grid with a wide publication-name column, an
original-on-hand column, six grouped month-pair sections, three fields
per month (`Rec'd`, `Currently on Hand`, `Moved`), thin black borders,
bold category divider rows, and light-gray shading on every Moved
column. Make the web entry experience responsive, but preserve this
original arrangement in desktop and print/PDF reports.
