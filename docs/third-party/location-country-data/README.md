# Country selection data

The committed `src/entities/location/model/countries.generated.ts` contains
249 ISO 3166-1 identities and country-name aliases from the recorded Node/ICU
runtime. It is used without a country API call or an added runtime dependency.
The list does not assert geocoder coverage or change market eligibility.

`iso_3166-1.json` is an unmodified copy from the local iso-codes distribution.
Its provenance, copyright and LGPL 2.1-or-later notice are retained in
`iso-codes-copyright.txt` and `LGPL-2.1.txt`. ICU/Unicode region-name data is
attributed to Unicode, Inc.; see `UNICODE-LICENSE-V3.txt` and
<https://www.unicode.org/license.txt> (read 27 November 2026).

`generation.json` pins the source and generated SHA-256, Node version, ICU
version and 22 languages used for aliases. The English and Estonian names
are display labels; the uppercase two-letter code is the stable identity.

To reproduce with the recorded runtime, run `node generate.mjs` from this
directory. The script writes the exact generated TypeScript to stdout and
refuses an input, runtime or output mismatch. It does not modify the source
file, install software, contact a provider or run during deployment.
