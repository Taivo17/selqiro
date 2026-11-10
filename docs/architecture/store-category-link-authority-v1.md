# Store category authority accepted in the user journey

Recorded 2026-11-10, Europe/Tallinn; exact acceptance time was not supplied.
After the completed authority installation, the user confirmed that saving a shop
category succeeded and the listing was found in that category on the public profile.
The requested outcome is accepted. The reply does not independently identify the
route, listing/category IDs or active identity, or prove every legacy form/account.
Previous category management acceptance remains valid; do not rerun the installer,
SQL or completed user tests. The installed application commit remains
`adfa3ae767712b5f71e9fac2d963a765f61fb444` according to the previous completed report.

Horse and service category assignments remain outside this implementation.
The next recommended scope is horse offers first, preserving their canonical UUID,
independent authorized assignment and safe category removal. See
`../continuity/HORSE_STORE_CATEGORY_NEXT_20261110.md`.
This is a documentation checkpoint pending the next controlled source update on Mac.
All earlier records below are retained verbatim as dated history, including their
now-superseded pending browser test. CURRENT_STATE.json owns the current next action.

---

# Store category authority installed checkpoint

Recorded 2026-11-10, Europe/Tallinn. The user's completed updater report
confirms commit `adfa3ae767712b5f71e9fac2d963a765f61fb444`, verified database authority,
the exact public client marker, and the retained successful build/push.
The earlier matching Vercel Ready / Production screenshot remains accepted.
One apply was acknowledged and a separate verification passed. All nine
guard groups and preserved dependency/invariant fingerprints matched.

The implementation contract below is retained unchanged. Its preparation-time
status and installation instructions are historical. The updater and SQL must
not be rerun. A single targeted live save through the new existing-listing
category review route remains to be confirmed after the authority change.
See `../continuity/CURRENT_STATE.json` and
`../continuity/STORE_CATEGORY_AUTHORITY_20261110.md` for current evidence.
This documentation checkpoint has not itself been installed or committed on
the user's Mac; issued source and installation packages remain immutable.

---

# Store-category link write authority v1

Prepared source, 2026-11-10. This document describes a narrow closure of the
legacy browser write path to `listing_store_categories`. Actual Mac application,
database verification, commit/push and deployment are recorded separately in
`../continuity/CURRENT_STATE.json`.

## Problem and scope

The integrated V2 editor already saves category assignments through
`set_my_listing_store_categories_v2(text, uuid[])`. Its database checks require
an authenticated user, an accessible stored active identity, a listing owned by
that identity, and categories belonging to that same identity. Its replacement
of the explicit assignment set is atomic.

Two legacy page handlers still write the join table directly:

| Source | Earlier behavior | Required replacement |
| --- | --- | --- |
| `app/sell/page.tsx` | Insert one category link after creating the listing. | Use the existing authorized assignment operation. |
| `app/my-page/page.tsx` | Delete the previous links, then insert one selected link. | Use the same atomic assignment operation, including an empty selection. |

The retained authenticated `FOR ALL` policy checks `listings.user_id`, without
requiring the selected category to belong to the listing's identity. Tightening
only the insert condition would leave the legacy delete-then-insert sequence
able to lose earlier links when the second request fails. The client and table
authority changes therefore belong to the same release.

## One existing database writer

Browser roles retain their existing SELECT access to the join table. Their
direct non-SELECT privileges are removed and the obsolete authenticated
`FOR ALL` policy is removed. Existing public read policy, owner/service authority,
table structure and authorized RPC bodies are preserved.

This includes table-wide privileges, not only INSERT/UPDATE/DELETE. PostgreSQL
row security does not cover TRUNCATE or REFERENCES. Privileges can also arise
from PUBLIC, inherited roles or column grants, so preflight and verification
must check effective authority as well as the target ACL and policy text.
Unexpected authority or catalog state stops the repair.

References: [PostgreSQL 17 row security](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
and [PostgreSQL 17 REVOKE](https://www.postgresql.org/docs/17/sql-revoke.html).

The existing assignment function remains the write authority. The repair adds
no second assignment RPC, client-only permission rule or user-ID ownership
fallback. An identity-less legacy listing remains ineligible for category
assignment until a separate deliberate identity migration exists. This release
does not perform that migration.

## Legacy client completion

A small adapter binds the initiating user, identity, listing and selected set,
then uses the existing captured-token managed assignment API. It must not send
direct table mutations, retry an uncertain write, or report a malformed/missing
receipt as a confirmed save.

The old page may have already saved listing basics or created a listing before
the category step. A rejected or unconfirmed category result must therefore be
reported as a partial outcome. It must not tell the user that the entire listing
save failed or encourage publishing a duplicate. The recovery path opens the existing listing's dedicated category review at
`/v2/my-area/listings/[id]/store-categories`. It uses the existing protected
reader/card/hook to load the saved set before a deliberate category action.
It does not require a publication receipt, so an identity-owned row created
by the legacy form can use it. Photo processing and the normal confirmed-save completion retain their
existing contracts; category errors do not authorize deleting the listing.

English and Estonian cover the new outcome messages. The new V2 category
selection, management and public profile interfaces retain their existing
behavior. The existing older V2 wrapper also calls the same strict database RPC;
it does not need a parallel write implementation.

## Installation and evidence

The repair is isolated in
`supabase/repairs/20261110_store_category_authority/`. Preflight recognizes only
the exact accepted old authority or the exact repaired authority. Application
is transactional and changes only the intended permissions/policy; verification
checks the resulting authority and preserved surrounding catalog invariants.
No application rows, categories, listings, photos or Storage objects are deleted
or rewritten by installation. Previously applied SQL files remain immutable.

The bounded updater requires the exact accepted management release and its
successful private report, then verifies the actual branch, HEAD, complete
index/worktree, source files and approved remote before Mac writes. Its order is:

1. Read the database preflight without changing authority.
2. Apply the client/documents, build the current source, then commit and push.
3. Verify the exact public client release marker on `https://selqiro.vercel.app`.
4. Recheck source, remote and marker, apply the authority repair once, and verify
   the resulting database state separately.

The content-hash-named JSON asset in `public/selqiro-release/` binds 39 explicit
client source inputs, including the changed legacy handlers, receipt-independent
review route and their existing managed API/auth/identity/translation dependencies.
It contains no account information, keys or credentials. The probe uses the
fixed HTTPS host, an exact expected body, bounded response/time limits and no
redirects. This is evidence that the prepared client marker is served from the
production portal; it is not a Vercel Ready/API/deployment-ID receipt.

If the marker is not yet available, the updater records a deployment wait and
performs no authority write. The same command may resume only that verified
committed/pushed source state without repeating its build, commit or push.
An uncertain database response is reconciled by reading the resulting state;
the apply is not blindly repeated. Other stopped or changed states require
their exact report to be reviewed.

Targeted verification must distinguish disposable SQL role tests, captured-token
client tests, browser fixture checks, local production build and actual Mac/
provider execution. Counts and hashes belong in the dated continuity record.
The earlier category-management user acceptance is retained and is not a new
test of this repair.

## Remaining boundaries

This release closes browser access to direct link-table mutation. It does not
claim a universal immutable relationship across every privileged database
writer. Existing category identity-transfer rules, general identity switching,
listing basics/images and unrelated legacy page operations are outside this
scope. There is no automatic cleanup or repair of historical assignment rows.

Already open tabs can retain an older client. The new marker proves the served
release, not replacement of every tab's JavaScript. Refresh the portal after the
update; the obsolete direct API writes then fail closed under the new authority.

Horse/service category assignment and terminal photo cleanup remain separate
work. Shop categories remain identity-scoped and separate from Selqiro's global
category tree. Marketplace participation has no Energy or plan gate.
