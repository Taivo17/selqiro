# Geography Library

Purpose

Shared geographic data used across Selqiro.

This module is the single source of truth for geographic information.

Current modules

- countries.ts

Future modules

- countryGroups.ts
- regions.ts
- continents.ts
- currencies.ts
- languages.ts
- timezones.ts
- coordinates.ts
- distance.ts
- geocoder.ts
- locationUtils.ts

Rules

- Geographic data must never be duplicated inside UI components.
- UI imports geographic data from this library.
- Business logic should not hardcode country lists.
- Future database synchronization should replace static data without changing UI components.

Architecture principle

Change data.
Do not change architecture.
