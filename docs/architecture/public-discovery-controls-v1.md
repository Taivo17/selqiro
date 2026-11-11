# Public discovery, own categories and publication periods

Decision date: 2026-11-11 Europe/Tallinn.
The one current implementation checkpoint is `../continuity/CURRENT_STATE.json`.
This document distinguishes the current category work from later product work.

## Public own-category filters — accepted requirement

The public profile shows an own-shop category only when at least one item that
the viewer can see belongs to that category or its descendants. Include the
necessary ancestor so the two-level tree remains navigable. Apply this rule to
both the combined ordinary/horse listings section and the separate services
section. An empty branch is not an invitation to browse an empty result.

Each section uses its own eligible content: a category with only an ordinary
listing does not appear in services, and a service-only category does not appear
in listings. Public category eligibility, result count and result pagination
must use the same visibility rules across the whole section, before a page is
limited. A draft, paused, inaccessible or expired object cannot make a public
category visible. Service expiry will join eligibility when that separate
lifecycle is implemented; this category change does not invent a deadline.

My Area category management and owner assignment selectors continue to show all
categories of the verified active identity, including empty categories. There
is one identity-owned `store_categories` tree, separate from global taxonomy.
The public filter does not delete or rename categories. Removing a category
removes associations while preserving listings, horse offers, services and
photos. Existing category management remains responsible for parent/child
removal rules.

Selecting a parent includes the descendant branch. A child narrows the result.
An object appears once even when multiple associations match. Selecting a child
when editing does not silently add a separate parent association.

## Result size and repeated service offers

The old profile service reader's `limit: 80` is a technical read limit, not a
confirmed permanent allowance or a new marketplace participation limit. Correct
paging is required regardless of how many distinct services a provider offers.

Recommended product rule: one real offer should normally be maintained through
its existing service record. Rewording the same offer should not gain extra
organic visibility. Distinct services may have separate records. Large record
count alone is not proof of duplication and is not grounds for an Energy gate.

Future duplicate guidance should first use bounded deterministic comparisons of
the submitting identity's own offers and point to an existing service for
editing. Do not introduce automatic AI calls on every form edit or silent
account penalties. Duplicate guidance and ranking diversity are separate work;
they are not delivered by the category package.

## Temporary provider hiding — recommended follow-up

The retained V1 code has `user_blocks`: a permanent account-to-account block
that also affects messages and mutual visibility. The inspected source does
not establish a separate expiring, viewer-only search-hiding feature. Do not
claim that the user never had such a feature, or relabel the existing block.

Recommended first action: **Peida see pakkuja 7 päevaks / Hide this provider for
7 days**, with immediate undo and a My Area list offering **Näita uuesti / Show
again**. Seven days is the current recommendation, not a deployed setting.

The preference belongs to the authenticated viewer account and targets a
provider identity. It survives the viewer's identity switch, while hiding one
business does not silently hide the owner's unrelated businesses or private
identity. Only that viewer's search and discovery results change. The provider
receives no notification or reputation penalty. Messages and deliberately
opened public profiles/detail links remain available under their normal rules.

Expiry uses server time. Search candidates, counts and pagination apply the
preference before limit/offset. Featured results and ads respect the same
preference. The preference must not be inserted into a general visibility
helper also used for direct public-profile or detail access.

## Publication periods — user direction; separate implementation

- Ordinary and horse listing activity remains the existing 90-day policy.
- Services: one year, using the existing documented 365-day policy.
- Job opportunities: one month. Define the exact calendar arithmetic in the
  jobs lifecycle implementation; do not silently rewrite the user's month as
  a separately approved fixed 30-day rule.

The old 2026-07-26 policy already recorded 365 days for services. The current
service publication runtime does not enforce a service activity deadline.
Policy evidence is not proof of current enforcement. The forthcoming service
lifecycle needs owner-facing deadline/expired state, public eligibility and
an explicit information-current confirmation. Its migration must define the
treatment of existing services from actual evidence rather than guess dates.

The recommended renewal action confirms the information is still current and
extends eligibility without changing the original creation/publication date,
claiming a fresh search position, or charging Energy. Category assignment,
status toggling and opening the editor do not renew an offer. Expiry preserves
the record in My Area. Paused or closed content is not silently reactivated.

## Jobs begin publicly on the company profile — accepted direction

This replaces the earlier 2026-11-11 advice to expose the entire jobs module
only to pilot accounts. A business identity may publish a job opportunity. Its
public profile and shareable job-detail link are the initial public surfaces.
Normal identity ownership/member authorization and publication validation apply.

Public availability and global discovery are separate capabilities. Until
general jobs discovery is enabled, the portal's general search, discovery
feeds, recommendation rows and primary Work navigation omit jobs. Profile and
detail reading remain public for eligible published offers. Hiding a menu item
alone does not enforce discovery eligibility. A profile-only offer is public,
not a private or secret posting; do not promise external search-engine exclusion.

Capture the global job category and the fields needed for later search from the
first version: provider identity, role/title, description, location, employment
attributes when supplied, salary amount/range with currency and period when
supplied, original publication and active deadline. An optional company own
category is distinct from the global job category. Reuse the same canonical job
record when global discovery opens; no copied listing or repost is needed.

Opening general discovery later should be a bounded capability rollout after
its queries, pagination and visibility are tested. Enabling it must not renew
or expose expired, paused, closed or otherwise ineligible offers. Prepare the
data contract now without claiming that a navigation-only change suffices.

Show before publication and in the resulting owner view:

> Tööpakkumine avaldatakse sinu ettevõtte avalikul profiilil. Saad jagada selle
> linki. Selqiro üldises tööotsingus seda praegu ei kuvata.

English fallback:

> Your job opportunity will be published on your company's public profile.
> You can share its link. It will not appear in Selqiro's general job search yet.

The first jobs scope is employer-side posting and contact through the existing
messaging context. Use **Võta ühendust / Contact**, not an application action
until an application flow exists. CV storage, applicant tracking, interviews
and candidate ranking remain outside that first scope.

## Delivery order and evidence

Continue the approved small-step order: first connect services to own shop
categories and apply the nonempty public-category rule to both sections.
Service activity, temporary provider hiding and jobs are separate follow-ups.
The current source package must not mark those capabilities as implemented.

Energy/payment core and the known public-launch gates keep their agreed
priority. A jobs discovery opening is not a condition for marketplace launch.
Record each concrete next action only in CURRENT_STATE and its generated
handoff; dated product discussions are not installer commands.
