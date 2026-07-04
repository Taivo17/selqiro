# Live Services Architecture

## Purpose

Live Services describes future support for businesses whose service availability changes during the day.

Examples:

- tow truck companies
- mobile repair services
- plumbers
- mobile mechanics
- taxis later
- seasonal mobile sellers
- mobile equipment services

Launch does not require a full live services system.

Architecture should allow it later.

---

## Core principle

Public user experience must stay simple.

Business tools can be more powerful underneath.

A user should see:

A tow truck is available near me.

Not:

A complicated fleet management system.

---

## Launch model

Launch should support a simple model:

- one Quick Update
- one active temporary service location
- one active temporary location per service when used
- no full fleet module required

This is enough for small service providers.

---

## Future mobile units module

Larger service providers may need a Mobile Units module.

Example:

A tow truck company has 10 trucks and drivers.

The company identity owns the service.

Each truck can be represented as a mobile unit.

Possible unit fields:

- unit name
- assigned driver
- service type
- current status
- current temporary location
- valid until
- visible or hidden
- notes for internal use

Possible statuses:

- available
- busy
- available later
- hidden
- offline

---

## Public display

Do not show every driver update as a public news feed.

This would become noisy.

Instead, public profile can show a compact summary.

Example:

Currently available:

3 tow trucks in Tallinn area
Nearest available: Gonsiori street area
Fast response available

If user opens details, Selqiro may show general available areas.

Avoid exposing unnecessary exact driver details.

---

## Search behavior

Live service units can affect service discovery.

Example:

A tow truck company normally operates in Järvamaa.

One truck is temporarily available in Tallinn until 16:00.

A user searches tow truck near Tallinn.

Selqiro can show:

Puksiir24
Currently available in Tallinn
Nearest unit: Gonsiori street area
Küsi abi

Search must consider:

- service category
- active unit location
- valid time window
- provider trust
- highlighting status if any

---

## One active location per unit

Each mobile unit can have one active location at a time.

Updating the location replaces the previous one.

This prevents one unit from appearing in many places simultaneously.

Example:

Unit 3:
12:00 Tallinn
15:00 Tartu
19:00 Paide

At each moment, only the current active location is used.

---

## Roles

Live Services requires role-based access later.

Possible roles:

Owner:
- manages company
- manages billing
- manages Energy
- manages units and staff

Manager:
- manages services
- manages units
- sees operational overview
- may not access billing unless allowed

Driver / worker:
- can update only assigned unit
- can set status
- can set temporary location
- cannot edit company profile
- cannot manage Energy
- cannot edit other units

This allows a company to use Selqiro as a work tool without giving all staff full access.

---

## Energy model

Live Services can use Energy when it creates extra business value.

Possible future packages:

- 1 active mobile unit
- 5 active mobile units
- 10 active mobile units

Duration options:

- 1 day
- 14 days
- 30 days

Longer duration should be cheaper per day.

More active units should cost more.

Service highlighting remains separate.

Temporary location tells Selqiro where the service is available.

Highlighting increases discovery visibility.

---

## Followers and updates

Individual unit location changes should not be sent to followers as separate news items.

That would create too much noise.

Followers may see only company-level Quick Updates.

Example:

Today more tow trucks are available in Tallinn.

Detailed unit availability is used mainly in:

- service search
- provider profile summary
- internal business dashboard

---

## Privacy and safety

Do not expose exact live GPS location by default.

Public display should usually show area-level information.

Examples:

- Gonsiori street area
- Tallinn city center
- 1.2 km away
- available near you

Exact details can be clarified in conversation or call.

This protects drivers and avoids unnecessary tracking exposure.

---

## Abuse prevention

Risks:

- fake availability
- fake locations
- appearing in many areas without real capacity
- excessive location spam
- misleading urgency

Controls:

- one active location per unit
- update history
- expiration time
- reporting
- trust impact
- admin review
- Energy cost for heavy use
- future stronger validation if needed

Launch does not require full GPS verification.

Architecture should allow it later.

---

## Relationship to Quick Update

Quick Update is the public lightweight message.

Mobile Units is the operational system.

Quick Update:
- one visible public announcement
- good for followers and profile visitors

Mobile Units:
- internal or semi-public service availability
- used by search and discovery
- supports multiple vehicles/workers later

Do not mix them into one noisy public feed.

---

## Final rule

Live Services should make mobile service providers more useful without making Selqiro complicated for normal users.

---

## Public service profile simplicity

Even if a service provider later uses multiple mobile units, the public profile must remain simple.

Do not show every unit update as profile news.

Public profile should show:

- Quick Update if owner chooses to publish one
- compact availability summary when relevant
- services
- contact action

Detailed unit management belongs to business tools, not the public profile.
