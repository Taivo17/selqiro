# V2 Listing Edit Plan

## Purpose

This document defines how V2 listing editing should be built.

Editing is more sensitive than viewing.

It affects:

- listing title
- description
- price
- category
- condition
- location
- coordinates
- details
- search_text
- status
- images
- store category assignment
- public visibility

Therefore editing must be built in small, safe steps.

Quality is more important than speed.

---

## Core principle

Do not copy the old My Page edit code directly.

The old code works as reference, but it mixes:

- UI state
- Supabase updates
- image loading
- storage deletion
- image upload
- category handling
- location/geocoding
- search_text generation
- store category assignment

V2 must separate these responsibilities.

---

## Production module target

Recommended module structure:

src/entities/listing/
  api/
    getEditableListingById.ts
    updateListingBasics.ts
    updateListingStatus.ts
    updateListingStoreCategory.ts
  model/
    editableTypes.ts
    buildListingSearchText.ts
    listingValidation.ts

src/entities/listingImage/
  api/
    getListingImages.ts
    uploadListingImages.ts
    deleteListingImage.ts
    reorderListingImages.ts
    setPrimaryListingImage.ts
  model/
    imageTypes.ts
    imageValidation.ts
    imagePath.ts

src/features/listing-edit/
  model/
    useEditableListing.ts
    useListingEditForm.ts
  components/
    ListingEditPage.tsx
    ListingBasicFields.tsx
    ListingLocationFields.tsx
    ListingImageManager.tsx
    ListingStatusPanel.tsx
    ListingSaveBar.tsx

---

## Route

Recommended route:

/v2/my-area/listings/[id]/edit

Reason:

Editing belongs to private My Area, not public listing detail.

Public route:

/v2/listing/[id]

Private edit route:

/v2/my-area/listings/[id]/edit

---

## Permissions

Before editing, verify ownership.

A user can edit a listing only when:

- logged in
- active identity exists
- listing.identity_id matches active identity id

Fallback for legacy listings:

- listing.user_id matches current user id

Preferred:

identity_id ownership.

Legacy fallback only where needed.

Do not rely only on client-side checks.

Database RLS must still protect data.

---

## Editing phases

### Phase 1 — Edit route skeleton

Goal:

Create route and page shell.

No saving yet.

It should show:

- loading state
- error state
- listing not found state
- owner mismatch state
- read-only listing preview
- "Save later" disabled state

This proves routing and ownership loading without risk.

---

### Phase 2 — Basic fields edit

Add safe editing for:

- title
- description
- price
- condition
- status

No image editing yet.

No category restructuring yet.

No AI yet.

Save action:

- update listing basics only
- refresh My Area list after save later
- show success/error clearly

---

### Phase 3 — Location edit

Add location fields:

- country
- city
- approximate location label
- coordinates when available

Rules:

- private users should use approximate area/city
- businesses may use exact address if selected
- exact private address should not be required
- geocoding should fail safely

---

### Phase 4 — Category and details edit

Add:

- category
- subcategory
- detail category
- dynamic fields
- details object
- search_text generation

Important:

search_text must be generated in one helper, not inline in UI.

Recommended helper:

buildListingSearchText(input)

---

### Phase 5 — Store category assignment

Add:

- listing_store_categories update
- store category selector

Rule:

Store category assignment is a separate operation.

Do not mix this deeply into basic listing save logic.

---

### Phase 6 — Image manager

Add image management separately.

Features:

- load existing images
- show sorted images
- first image is primary
- add new images
- delete image
- set primary image
- reorder later if needed

Important:

Image editing is risky.

Build it after basic listing edit works.

Rules:

- validate file type
- validate max image count
- resize before upload
- use storage paths carefully
- delete DB row and storage object carefully
- if deletion fails, show error
- do not leave UI in uncertain state

---

### Phase 7 — AI assist

Add AI category assist after manual edit is reliable.

Allowed:

- user uploads image
- AI suggests category/title/details
- user confirms or changes
- manual category remains available

Not allowed:

- AI automatically changes published listing without confirmation
- AI final category without user review

---

## Listing update data model

Basic update should include:

- title
- description
- price
- price_amount
- status
- condition

Later update includes:

- category
- subcategory
- location
- city
- country
- listing_lat
- listing_lng
- details
- search_text

---

## Search text rule

search_text should be built from:

- title
- description
- category
- subcategory
- condition
- country
- city
- manufacturer
- part number
- OEM number
- vehicle brand
- vehicle model
- vehicle year
- engine
- dynamic fields

Do not duplicate this logic in UI components.

---

## Image rule

Image management should be its own module.

Do not put image upload/delete logic inside the main listing edit page.

Reason:

Image handling has separate failure modes:

- file validation
- upload failure
- delete failure
- database row mismatch
- primary image mismatch
- storage path parsing
- max image count
- preview cleanup

---

## UI quality rule

Do not show working-looking buttons for unfinished actions.

If edit is not ready:

- show disabled
- label clearly
- or hide action

Examples:

- "Muuda hiljem"
- "Piltide muutmine hiljem"
- "AI soovitus hiljem"

---

## Launch minimum for listing edit

Launch minimum can be:

- edit title
- edit description
- edit price
- edit status
- edit condition
- view existing images
- no image editing yet if not reliable

Image editing can launch later if risky.

However, if old listing image editing is already stable and can be cleanly modularized, it can be added before launch.

Decision should be based on reliability, not speed.

---

## Do not do in first edit step

Do not start with:

- full image upload/delete
- full AI category assist
- complex dynamic field editor
- store category assignment
- all status flows
- moderation history
- premium/highlight controls

Start simple.

---

## Recommended next implementation step

Next code step:

Create:

- /v2/my-area/listings/[id]/edit
- getEditableListingById
- useEditableListing
- ListingEditPage read-only skeleton

No saving yet.

This is safe and testable.

After that:

Add basic save.

---

## Definition of Done for each phase

Each phase must have:

- build green
- route opens
- loading state
- error state
- permission/owner check
- no dead buttons
- docs updated
- commit pushed

---

## Final rule

Listing editing must be built carefully.

Viewing data is already connected.

Editing data changes production content.

Therefore each edit capability must be added in small, tested pieces.
