# Product Discovery

## Purpose

Product Discovery is the main browsing and searching experience for products.

The goal is simple:

Help the user find a useful product as naturally as possible.

The user should not feel like they are operating a complicated marketplace system. They should feel like Selqiro is helping them narrow down real-world options.

---

## User flow

Typical product flow:

Homepage
↓
Products
↓
Category
↓
Subcategory
↓
Product Discovery
↓
Listing detail
↓
Contact seller

Example:

Homepage
↓
Products
↓
Garden
↓
Lawn mowers
↓
Product list
↓
Listing detail
↓
Message seller

---

## Core principle

Product Discovery must stay simple.

The user should see products first, not filters first.

Filters help only when the user wants to narrow the list.

---

## Search behavior

Search should update results immediately.

There is no "Apply filters" button.

When the user changes:
- search text
- price
- category
- condition
- location
- sorting

the product list updates automatically.

This keeps the experience fast and natural.

---

## Filter behavior

Filters are temporary UI panels.

They should not permanently take screen space.

The visible interface should be minimal:

Search
Price
Location
Filters

When the user clicks a filter control, a temporary panel opens.

After the user makes a choice:
- the product list updates immediately
- the filter panel can close
- the user continues browsing products

Rule:

Filters must not interrupt product browsing.

---

## Desktop filter layout

On desktop, filters can open as:
- a clean dropdown panel
- a right-side drawer
- or an upper overlay panel

The exact placement can be refined during UI implementation.

The important rule is:

Filters are available but not visually dominant.

Products remain the main focus.

---

## Mobile filter layout

On mobile, the filter button should always be easy to access but not annoying.

Recommended behavior:

Search bar
Filter link / button
Product list

When the user taps Filters:
- a full-screen or bottom-sheet filter panel opens
- user changes values
- results update
- user returns to product list

There should be no separate "Apply filters" button.

If needed, there can be a simple "Done" or close action, but it should not be required for applying changes.

---

## Price filter

Price should use one compact visible control.

Default visible state:

Price

After selection:

100€ - 300€

When opened, it shows two inputs:

From
To

This saves space compared to permanently showing two separate fields.

---

## Currency behavior

Selqiro is global by design.

A listing always has an original price and original currency.

Example:

Original price: ¥380,000
Original currency: JPY

The original seller price must always be preserved.

If the viewer uses a different currency, Selqiro can show an approximate converted value:

¥380,000
≈ 2,350 €

Important rules:

- original price is the source of truth
- converted price is only for user understanding
- converted price must be clearly approximate
- exchange rate date should be available when relevant
- currency logic belongs to the global platform layer, not only marketplace

---

## Location behavior

Selqiro should keep the "near me" logic.

The system starts near the user and expands the search area automatically when needed.

The user should not need to manually choose fixed distance limits in most cases.

Visible location control:

Near me
Paide
Change

The user can change the search location.

The product list can show distance on listing cards.

Recommended distance feeling:

Near: green
Further away: white / grey

Avoid red for distance.

Red feels like danger or error, but a listing being far away is not wrong.

---

## Loading behavior

Product Discovery should use automatic loading.

There should be no required "Load more listings" button.

When the user approaches the end of the list, Selqiro loads more results automatically.

This matches the current Selqiro behavior and should be preserved.

---

## Featured and discovery content

Featured products may appear in discovery areas, but they must not unfairly replace organic results.

Rules:

- paid or featured visibility must be clearly separated
- organic ranking must remain trustworthy
- featured items can also appear in their normal organic position
- Today's Story and featured discovery are discovery surfaces, not hidden ranking manipulation

---

## Ranking principles

Organic ranking should consider:

- relevance
- distance
- freshness
- listing quality
- seller trust signals
- category match

Paid visibility must not secretly override organic ranking.

---

## Empty state

If no products are found, Selqiro should not simply show a dead end.

It can suggest:

- expanding nearby area
- changing search location
- removing a filter
- checking related categories
- looking for a service instead
- creating a saved alert later

Example:

No lawn mowers found near Paide.

Try:
- nearby areas
- all Estonia
- garden services
- remove price filter

---

## AI support

AI should assist quietly.

AI can help with:

- choosing a category
- explaining filters
- suggesting related options
- turning natural language into filter choices

Example:

User: I need a lawn mower for a small garden.

Selqiro can suggest:
- electric
- compact
- lower price range
- nearby listings

AI should not dominate the product browsing interface.

---

## What Product Discovery should feel like

Product Discovery should feel:

- calm
- local
- fast
- understandable
- useful
- not overloaded

The user should think:

I can quickly see what is available near me.

Not:

I need to learn how this marketplace works.

---

## Final rule

Product Discovery is not a filter system.

It is a guided path from curiosity to a useful listing.

---

## Visual layout decision

Current Product Discovery visual direction is accepted.

Desktop:
- default layout can use a clean product grid
- cards may show larger images
- browsing should feel visual and calm
- grid layout is preferred for V2 Launch

Mobile:
- default layout should use compact horizontal cards
- image on the left
- text and key details on the right
- this supports faster scrolling and easier comparison on small screens

Future:
- desktop list view may be added later as an optional view mode
- V2 Launch does not require both grid and list views

Decision:
Keep desktop grid layout for launch.
Use mobile horizontal list cards for launch.
