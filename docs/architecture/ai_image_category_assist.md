# AI Image Category Assist Architecture

## Purpose

AI Image Category Assist helps users create listings and services faster.

It analyzes uploaded images and suggests:

- product or service category
- subcategory
- detail category when available
- title suggestion
- brand/model when confidently detected
- relevant form fields when safe

This feature is important for V2 Launch because it improves the listing/service creation flow without requiring hidden automation.

---

## Core principle

AI assists.

User confirms.

AI must not silently publish or decide final category without user confirmation.

---

## Launch decision

AI image-based category suggestion is included in V2 Launch.

Reason:

It gives immediate user value and reduces friction when creating listings or services.

It is allowed under the quality-first principle because failure does not break the portal.

If AI is wrong or uncertain, user can manually choose the category.

Manual category selection must always remain available.

---

## Product listing flow

Product listing flow:

1. User uploads one or more product images.
2. AI analyzes image(s).
3. AI suggests category, subcategory and detail category.
4. AI may suggest title and brand/model if confident.
5. User confirms or changes suggestions.
6. Listing form opens with the correct fields.
7. Listing is saved only after user confirmation.

AI output is not final until user confirms it.

---

## Service flow

Service creation can use similar AI logic, but in service mode.

Service flow:

1. User uploads service image.
2. User may add service title or short description.
3. AI analyzes image + text context.
4. AI suggests service category.
5. User confirms or changes category.
6. Service form opens with relevant fields.
7. Service is saved only after user confirmation.

Service category selection should not rely only on image recognition.

A service image may be ambiguous.

Example:

- a van may mean transport, repair, delivery, towing or mobile service
- a person with tools may mean many trades
- a salon image may mean beauty, barber, spa or training

Use image + text + identity context.

---

## Separate modes

AI category assist must know which mode it is in.

Modes:

- product_listing
- service
- product_showcase later
- job later
- event later

Do not let product category results leak into service category suggestions.

Example:

A tow truck image in product mode may mean vehicle.

A tow truck image in service mode may mean towing service.

Context matters.

---

## Category tree rule

AI must select from existing category tree values.

AI should not invent category strings.

Good:

vehicles > cars > passenger_cars

Bad:

"cool sport car category"

Production flow:

AI output
↓
normalize
↓
alias mapping
↓
validate against category tree
↓
fallback if invalid
↓
user confirmation

---

## Mapping layer

Use a dedicated AI category mapping layer.

It should handle:

- normalization
- aliases
- spelling differences
- plural/singular
- synonym mapping
- fallback
- category validation

Do not keep this logic inside page components.

Recommended future module:

src/entities/category/
  aiCategoryMapping.ts
  categoryTree.ts
  serviceCategoryTree.ts
  normalizeCategory.ts

or existing lib/aiCategoryMapping.ts can be migrated into this structure.

---

## Reliability rules

AI category assist is launch-safe only if:

- user can always override the suggestion
- manual category selection exists
- AI failure does not block listing/service creation
- AI output is validated against allowed categories
- invalid category output falls back safely
- category mapping is separate from UI
- no hidden automatic publishing happens

If any of these are missing, keep the AI assist disabled until fixed.

---

## Confidence behavior

If AI is confident:

Show suggested category selected.

If AI is uncertain:

Show suggestion as optional and ask user to choose.

If AI cannot classify:

Do not force category.

Show manual category selection.

Good wording:

AI soovitas seda kategooriat. Palun kinnita või muuda.

Or:

AI ei olnud kindel. Vali kategooria käsitsi.

---

## Feedback learning later

Future improvement:

Store AI suggestion and final user choice.

This creates a feedback dataset.

Examples:

AI suggested:
vehicles > accessories

User chose:
vehicles > riding_gear

After repeated corrections, Selqiro can suggest alias mappings or prompt hints.

Initial feedback table could store:

- mode
- detected_object
- ai_title
- ai_category
- ai_subcategory
- ai_detail_category
- final_category
- final_subcategory
- final_detail_category
- confidence
- language
- created_at

This should not automatically change production behavior at first.

Start by collecting data.

Use repeated corrections to improve mappings later.

---

## Product vs service examples

Product mode examples:

Image:
phone

Suggested:
electronics > phones

Image:
lawn tractor

Suggested:
home_garden > garden_machinery > lawn_tractors

Image:
car battery

Suggested:
vehicles > parts > batteries

Service mode examples:

Image:
tow truck

Suggested:
services > auto_help > towing

Image:
garden machine repair

Suggested:
services > repair > garden_equipment_maintenance

Image:
hair salon

Suggested:
services > beauty > hairdresser

---

## What not to do at launch

Do not:

- auto-publish based only on AI
- hide manual category selection
- let AI invent categories
- use AI category result for hidden ranking
- use AI to decide if seller is trustworthy
- use AI private message content
- make service category decisions from image alone

---

## Final rule

AI image category assist is a launch feature.

It must be user-confirmed, category-tree validated and manually overrideable.

It should make listing and service creation easier without creating hidden automation risk.
