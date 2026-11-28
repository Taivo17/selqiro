// Reproduce the committed data with the exact runtime recorded in generation.json.
// This is a maintainer utility, not part of the application or updater execution.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base = new URL('./', import.meta.url);
const metadata = JSON.parse(readFileSync(new URL('generation.json', base), 'utf8'));
const isoBytes = readFileSync(new URL('iso_3166-1.json', base));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
if (process.version !== metadata.node || process.versions.icu !== metadata.icu || sha(isoBytes) !== metadata.source_sha256) {
  throw Error('Use the exact recorded ISO data, Node version and ICU version. Do not silently replace names.');
}
const rows = JSON.parse(isoBytes)['3166-1'].sort((a,b) => a.alpha_2.localeCompare(b.alpha_2));
const display = Object.fromEntries(metadata.locales.map(locale => [locale, new Intl.DisplayNames([locale], {type:'region'})]));
const data = rows.map(row => ({code:row.alpha_2, en:display.en.of(row.alpha_2), et:display.et.of(row.alpha_2),
  aliases:[...new Set([...metadata.locales.map(locale => display[locale].of(row.alpha_2)), row.name, row.official_name,
    row.common_name, row.alpha_2, row.alpha_3].filter(Boolean))]}));
const output = '// Generated 2026-11-27 from ISO 3166-1 codes and the pinned Node ICU region names.\n'
  + '// No country API is called while typing. Names/aliases are data, not market eligibility.\n'
  + 'export const LOCATION_COUNTRY_DATA = ' + JSON.stringify(data, null, 2) + ' as const;\n';
if (data.length !== metadata.codes_count || sha(output) !== metadata.artifact_sha256) throw Error('Generated data differs from the accepted artifact.');
process.stdout.write(output);
