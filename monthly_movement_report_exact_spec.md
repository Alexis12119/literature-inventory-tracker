# Exact Report Layout and Wording Specification

## Monthly Movement of Literature --- Tagalog Inventory Report

## 1. Purpose and strict fidelity requirement

This document specifies the **report itself**, based on the supplied PDF
`2027(TG) - Monthly Movement of Literature(1st)(1).pdf`. The
implementation agent may not be able to inspect the PDF, so this file
records the visible report wording, row order, headings, column order,
and visual structure in text.

**Requirement: reproduce the report faithfully.** The generated report
must resemble the source form, not merely contain equivalent
information. Preserve the title, instruction wording, language label,
month/year line, section names, item numbers, publication names,
abbreviations, six month-pair headings, subcolumn labels, ordering,
grid, and gray shading. Do not paraphrase, modernize, translate,
spell-correct, or silently "fix" wording in this source report. Where
the source itself has unusual spelling, capitalization, punctuation, or
wording, preserve it in the report template.

This document describes the form's wording and design. Do not use the
sample's displayed inventory quantities as permanent default data. Those
quantities are example report data and must be stored only if the user
explicitly imports them.

## 2. Page and typography

-   Use a white page and black text.
-   Print/export in **landscape orientation**.
-   Use narrow page margins so the complete six-month table fits
    horizontally.
-   The source is a formal office form, not a dashboard.
-   Center the uppercase report title at the top:
    `MONTHLY MOVEMENT OF LITERATURE`.
-   Use compact, formal typography. The original has a traditional
    serif-like appearance in the title and very small, dense table text.
-   Use thin black rectangular cell borders throughout the grid.
-   Use a stronger outer border and clear header separators.
-   Shade every `Moved` data column a pale gray from its header/body
    area through the table rows, matching the source. Do not shade the
    entire month group; the emphasis is specifically on the Moved
    column.
-   Keep other data cells white.
-   Use bold category-divider rows.
-   Avoid colors, rounded cards, gradients, shadows, charts, icons,
    decorative headers, or oversized UI styling in the printed report.
-   The report may span multiple pages vertically. Repeat the column
    header rows on continuation pages. Keep category labels with their
    next item row when possible.
-   Keep the item/name columns at the left and all six month-pair groups
    on the same horizontal page.

## 3. Exact heading and instruction wording

Render the following wording exactly, including punctuation and
capitalization. Preserve line breaks only as needed for page layout; do
not rewrite the sentences.

``` text
MONTHLY MOVEMENT OF LITERATURE
INSTRUCTIONS:                            LANGUAGE: TAGALOG
1. Language-coordinating congregations take an actual count of literature each month, and the quantity is entered in the “Currently on Hand” column.
2. “Rec’d” column: Post the quantity of each item received.
3. “Moved” column: Post the quantity of each item moved. This can be determined by (1) adding together what was received during the month with
what was on
hand from the previous month and then (2) subtracting from this total the number of the actual count just taken (“Currently on Hand”).
4. With the exception of the Organized book, special-request items are not listed on this report, since they should not be kept in stock. If for some
reason
special-request items are on hand, post the quantities in one of the general categories, such as “Other Bibles.”
5. Twice a year, the branch office will ask language-coordinating congregations to submit their inventory reports via JW Hub. When doing so, the
following actions should be taken by the literature servant:
     ● (1) Prior to submitting the inventory report, please review the List of Publications Approved for Discard (S-60) and follow the instructions
          to discard any items appearing in the list.
     ● (2) Record the inventory count on the latest version of the Monthly Movement of Literature (S-28) form. Include any literature stored on
          public witnessing carts.
     ● (3) Submit the inventory report via JW Hub. On the JW Hub home page, select “Literature,” then select “Inventory Reports.” An inventory
          report should be submitted for each language displayed.
     ● (4) Determine how much literature can be shared with nearby congregations. On the JW Hub home page, select “Literature,” then
          “Inventory Reports,” and then “Maintain Current Inventory.” Update the “Quantity to Share” column.
```

Note: The source PDF visually wraps some sentences across lines because
of page width. Those line wraps may change with font metrics, but the
actual words, punctuation, and sequence must remain unchanged. The
heading says `LANGUAGE: TAGALOG`, while the instruction body itself is
in English. Preserve that exact combination in this report template
unless the user supplies a different official form.

## 4. Exact report metadata and column labels

Render the following metadata and column headings:

-   Metadata line: `Month & Year: August, 2026` in the supplied sample.
    In the application, replace only `August, 2026` with the selected
    report month and year.
-   Title: `MONTHLY MOVEMENT OF LITERATURE`
-   Language label: `LANGUAGE: TAGALOG`
-   Fixed columns:
    -   `Item No.`
    -   `Name`
    -   `Originally on Hand`
-   Month-pair groups in this exact order:
    1.  `Sep/Mar`
    2.  `Oct/Apr`
    3.  `Nov/May`
    4.  `Dec/June`
    5.  `Jan/July`
    6.  `Feb/Aug`
-   Under **each** month-pair group, render these three subcolumns in
    this exact order:
    1.  `Rec'd` for the first group in the source; later group labels
        appear as `Rec'd` or `Rec’d` depending on the source typography.
        For consistent visual fidelity, use `Rec'd` as shown in the
        table header text extraction.
    2.  `Currently on Hand`
    3.  `Moved`

Do not change `Dec/June` to `Dec/Jun`, `Originally on Hand` to
`Opening Stock`, `Rec'd` to `Received`, or `Moved` to `Issued/Used`.
Those would no longer match the source form.

## 5. Table structure and dimensions

The table contains three identifying columns followed by six monthly
groups of three columns each: - 3 fixed columns: `Item No.`, `Name`,
`Originally on Hand` - 6 × 3 monthly subcolumns = 18 monthly columns -
Total: **21 logical columns**

Recommended proportions: - `Item No.`: narrow. - `Name`: substantially
wider than every quantity column. - `Originally on Hand`: narrow, but
wide enough to display the full two-line label. - Each of the eighteen
monthly columns: narrow and approximately equal width, with enough space
for small centered numeric values. - Keep the whole table horizontally
within a landscape page. - Use multi-line labels in the header to fit
the narrow cells, particularly `Currently on Hand`. - Use centered
alignment for headings and numeric quantities. Use left alignment for
publication names and item numbers. - Keep row heights compact, but
allow long names to wrap to two lines where needed.

### Header hierarchy

The header is multi-level: 1. A top line containing the `Month & Year`
metadata on the left and the six month-pair group labels across the
right side. 2. A lower header line containing `Item No.`, `Name`,
`Originally on Hand`, and the three subcolumn labels under each month
pair.

In the original PDF, the report title and instruction block precede the
grid. The grid begins beneath the instructions and month/year row. Keep
the instruction block compact enough that the inventory table remains
dense and report-like.

## 6. Exact category and item row order

Use the following section headings and item rows in this exact sequence.
Preserve item numbers, punctuation, capitalization, abbreviations, and
spellings as written below. The section headings are labels, not
inventory items. Where a row has no item number, leave the item-number
cell blank.

``` text
SECTION: Bibles
5140 | New World Translation nwt
5142 | New World Translation (pocket size) nwtpkt
5100 | Other Bibles

SECTION: Teaching Toolbox
7305 | Invitation to congregation meetings inv
8410 | Contact card (picture of open Bible) jwcd1
8524 | Contact Card (jw.org logo only) jwcd4
8569 | Contact Card (in-person Bible course) jwcd9
8570 | Contact Card (virtual Bible course) jwcd10
5445 | Enjoy Life Forever! llf
65445 | Enjoy Life Forever! brochure llfi
6657 | Listen and Live ll
7130 | View the Bible T-30
7131 | View the Future T-31
7132 | Happy Family Life T-32
7133 | Who Controls the World? T-33
7134 | Will Suffering End? T-34
7135 | Live Again T-35
7136 | Kingdom T-36
7137 | Website Tract T-37

SECTION: Books
5414 | Ministry School be
5340 | Teach Us bhs
5416 | Bearing Witness bt
5231 | "My Follower" cf
5331 | Close to Jehovah cl
5227 | Family Happiness fy
5419 | Imitate ia
5329 | Isaiah's Propechy I ip-1
5330 | Isaiah's Propechy II ip-2
5232 | Jeremiah jr
5425 | Jesus-The Way jy
5422 | God's Kingdom Rules! kr
5427 | Learn From the Bible lfb
5415 | Teacher lr
5343 | Remain in God's Love lvs
5332 | Organized od
5435 | Pure Worship rr
5341 | "Sing Out Joyfully" sjj
5441 | "Sing Out Joyfully" (large size) sjjs
5442 | "Sing Out Joyfully"-Lyrics Only sjjyls
5339 | Young People Ask, Volume 1 yp1
5336 | Young People Ask, Volume 2 yp2
5200 | Other books

SECTION: Brochures and Booklets
6618 | Reading and Writing ay
6652 | Bible's Message bm
6638 | Education ed
6659 | Good News fg
6645 | God's Friend gf
6665 | Happy Family hf
6662 | Happy Life hl
6660 | Jehovah's Will jl
6647 | Satisfying Life la
6654 | Was Life Created? lc
6658 | Listen to God ld
6655 | Origin of Life lf
6663 | My Bible Lessons mb
6648 | Road to Life ol
6639 | Lasting Peace pc
6653 | Pathway ph
6671 | Return to Jehovah rj
6656 | Real Faith rk
6630 | Spirits of the Dead sp
6667 | Teaching th
6670 | Wisdom From the Gospels wfg
6635 | Why Worship God wj
6664 | Teach Your Children yc
6684 | 10 Questions ypq
6600 | Other brochures and booklets

SECTION: Forms (1 inch = 300)
8724 | Transaction Record S-24
8704 | Field Service Report S-4
8708 | House-to-House Record S-8

SECTION: Public Magazines
Awake! No.1 2018 | g18.1
Awake! No.2 2018 | g18.2
Awake! No.3 2018 | g18.3
Awake! No.1 2019 | g19.1
Awake! No.2 2019 | g19.2
Awake! No.3 2019 | g19.3
Awake! No.1 2020 | g20.1
Awake! No.2 2020 | g20.2
Awake! No.3 2020 | g20.3
Awake! No.1 2021 | g21.1
Awake! No.2 2021 | g21.2
Awake! No.3 2021 | g21.3
Awake! No.1 2022 | g22.1
Watchtower No.1 2018 | wp18.1
Watchtower No.2 2018 | wp18.2
Watchtower No.3 2018 | wp18.3
Watchtower No.1 2019 | wp19.1
Watchtower No.2 2019 | wp19.2
Watchtower No.3 2019 | wp19.3
Watchtower No.1 2020 | wp20.1
Watchtower No.2 2020 | wp20.2
Watchtower No.3 2020 | wp20.3
Watchtower No.1 2021 | wp21.1
Watchtower No.2 2021 | wp21.2
Watchtower No.3 2021 | wp21.3
Watchtower No.1 2022 | wp22.1
All other public magazines
```

### Important note on magazine rows

The source form's magazine rows show the issue name and issue code in
the Name area; some rows may wrap. Do not invent item numbers for these
magazine rows. Preserve their listed order.

## 7. Source sample data versus template structure

The PDF contains some populated quantities in the `Feb/Aug` area and a
few other rows. These are sample/report values for the period shown, not
fixed labels or default values. The report template should render the
actual saved quantities for the selected reporting period.

Do not prefill every new report with the quantities shown in this PDF.
Do not copy the sample values into every language or every year. If the
user chooses to import this particular historical report, preserve its
values as a historical record and keep the source period and language
associated with it.

## 8. Interactive web entry versus the report output

The web application can have a modern, accessible editing interface, but
**the final report output must follow this form**.

-   On desktop, show the six month-pair groups together in one
    horizontally scrollable grid.
-   On mobile, a selected-month editing view may be used for usability.
-   Printing, PDF export, and any report preview intended to reproduce
    the form must use the full landscape layout with all six month-pair
    groups together.
-   The report's wording and publication row labels must come from this
    specification/source form, not from newly invented UI labels.
-   The app may have separate navigation and data-entry controls outside
    the report. Do not place website navigation, dashboard cards, or
    app-only buttons inside the printed report.
-   Keep English and Tagalog inventories separate, and preserve the
    selected language label.

## 9. Exactness checklist for the coding agent

Before considering the report complete, verify all of the following:

-   [ ] Title is exactly `MONTHLY MOVEMENT OF LITERATURE`.
-   [ ] Instruction heading is exactly `INSTRUCTIONS:`.
-   [ ] Language label is exactly `LANGUAGE: TAGALOG` for this template.
-   [ ] All five instruction paragraphs are present with source wording,
    including references to S-60, S-28, JW Hub, and `Quantity to Share`.
-   [ ] Month/year appears as `Month & Year: [selected month, year]`.
-   [ ] Month groups appear in this order: `Sep/Mar`, `Oct/Apr`,
    `Nov/May`, `Dec/June`, `Jan/July`, `Feb/Aug`.
-   [ ] The fixed columns are `Item No.`, `Name`, and
    `Originally on Hand`.
-   [ ] Every group contains `Rec'd`, `Currently on Hand`, and `Moved`.
-   [ ] Every category and publication row is in the order specified in
    this document.
-   [ ] Source spellings such as `Isaiah's Propechy I`,
    `Isaiah's Propechy II`, and `Enjoy Life Forever! brochure` are not
    silently corrected.
-   [ ] The report uses landscape orientation, a compact table, thin
    black grid lines, and light-gray Moved columns.
-   [ ] All six month-pair groups fit on the same horizontal page.
-   [ ] The report does not replace the original grid with cards or
    charts.
-   [ ] The sample quantities are not used as new-report defaults.

## 10. One-paragraph directive to include in the main prompt

The generated report must faithfully reproduce the supplied Monthly
Movement of Literature PDF, not just its general concept. Match the
source title, instruction text, `LANGUAGE: TAGALOG` label, month/year
line, exact month-pair headings (`Sep/Mar`, `Oct/Apr`, `Nov/May`,
`Dec/June`, `Jan/July`, `Feb/Aug`), fixed columns (`Item No.`, `Name`,
`Originally on Hand`), monthly subcolumns (`Rec'd`, `Currently on Hand`,
`Moved`), category headings, publication row names/codes/order, black
grid lines, compact formal typography, landscape orientation, and
light-gray Moved columns. Preserve the source's exact wording and
spellings even if they look unusual. Do not substitute modern labels,
translate the English instructions, silently correct text, or replace
the report grid with a dashboard. Change only the selected month/year,
selected language where an official corresponding template exists, and
the saved inventory quantities.
