# Public discovery, own categories and publication periods

Decisions: 2026-11-11; provider controls confirmed 2026-11-13 Europe/Tallinn.
The one current implementation checkpoint is `../continuity/CURRENT_STATE.json`.
This document preserves the product decisions. Services-to-own-categories is accepted;
service activity is installed at 955c935, with matching Vercel Ready and user acceptance.

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
category visible. The installed activity release adds the 365-day server
deadline to that same predicate. Exact installation and acceptance evidence
are recorded in CURRENT_STATE.

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

## Temporary provider hiding — confirmed 24 hours

On 2026-11-13 the user selected **24 hours**, replacing the earlier seven-day
recommendation. The user also requested separate persistent blocking with the
previously agreed behavior. These decisions are not a deployed implementation.

Action: **Peida pakkuja 24 tunniks / Hide provider for 24 hours**. Offer
immediate **Võta tagasi / Undo** and a My Area hidden-provider list with name,
avatar/logo, expiry and **Näita uuesti / Show again**.

The preference belongs to the authenticated viewer account and targets a
provider identity. It survives the viewer's identity switch while leaving
the provider's unrelated identities alone. Only that viewer's search and
discovery results change. The provider receives no notification or reputation
penalty. Messages and deliberately opened profiles/detail links retain their
normal permissions. The action is free of an Energy purchase requirement.

The deadline is 24 elapsed hours from the accepted server action. Viewing or
refreshing does not extend it. Expiry follows server time and must work even
if background cleanup has not run. Search candidates, counts and pagination
apply the preference before limit/offset using an indexed, viewer-scoped
exclusion. Avoid a request per result or downloading the entire result set.
Featured results and existing ads follow the same preference. Do not insert
temporary hiding into a visibility helper also used for direct profile/detail
access. Review changed query plans without claiming a production load test.

## Persistent user blocking — preserve the previous contract

The retained V1 source audit describes account-to-account user_blocks, which
affects messaging and mutual visibility. Locally available public-category
SQL checks both account directions. That limited source does not establish
that every current discovery, messaging and profile route is fully protected.

The recovered 2026-06-02/03 user agreement requires a bidirectional sending
ban while retaining existing conversations and history. The blocked account
cannot access the blocker's shop/profile. Only the blocker can remove their
own block; the other party sees the blocked state. My Area needs a blocked
users list with name and avatar/logo. Historical mention of deleting one's
own inbox entry is not authorization to delete messages in this work.

Action: **Blokeeri kasutaja / Block user**, separate from temporary hiding,
with a confirmation that explains the effect on visibility and messages.
It does not expire automatically. **Eemalda blokeering / Unblock user**
removes only the actor's own block. Reuse the existing authoritative
user_blocks record and permissions; do not create a second blocking registry.
Verify the current provider-identity-to-account mapping and server/RLS checks
before connecting the action. Empty BlockedUsersCard.tsx/useBlockedUsers.ts
inventory entries do not establish a working management screen.

The controls remain independent: hiding expiry/undo cannot remove a block;
unblocking cannot remove a separate active hide or the other account's block.
Existing conversations and user content are preserved. The current source
integration and actual user path still require implementation and verification.
See ../continuity/VIEWER_PROVIDER_CONTROLS_20261113.md for the bounded next step.

## Publication periods — user direction; separate implementation

- Ordinary and horse listing activity remains the existing 90-day policy.
- Services: one year, using the existing documented 365-day policy.
- Job opportunities: one month. Define the exact calendar arithmetic in the
  jobs lifecycle implementation; do not silently rewrite the user's month as
  a separately approved fixed 30-day rule.

The old 2026-07-26 policy already recorded 365 days for services. The installed
2026-11-11 service activity release implements 365 × 24 hours from the database
clock, owner deadline/expired presentation, shared public eligibility and an
explicit information-current confirmation. Existing published services and
archives with a published_at timestamp receive one transition year from activation;
original content dates stay unchanged and no past user confirmation is invented.
See service-activity-v1.md and ../continuity/SERVICE_ACTIVITY_ACCEPTED_20261111.md.
Mac activation, matching Vercel Ready and user acceptance are now recorded separately.

The installed renewal action confirms the information is still current and
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

The service own-category step and nonempty public filters have been accepted.
The activity release is installed and user-accepted at 955c935, with matching
Vercel Ready / Production. Do not repeat its installation. Temporary provider
hiding for 24 hours and separate persistent blocking are now user-confirmed
next work. Their integration and jobs remain separate later modules. They are not
implemented by the service activity package.

Energy/payment core and the known public-launch gates keep their agreed
priority. A jobs discovery opening is not a condition for marketplace launch.
Record each concrete next action only in CURRENT_STATE and its generated
handoff; dated product discussions are not installer commands.
