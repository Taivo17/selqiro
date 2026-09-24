/** Shared owner detail/list money display. Call only with validated amounts. */
const options: Intl.NumberFormatOptions = {
  style: "currency", useGrouping: true,
  minimumFractionDigits: 0, maximumFractionDigits: 2,
};
// The bounded EE owner list can contain many wanted rows; reuse its formatter.
const euroFormatter = new Intl.NumberFormat("et-EE", { ...options, currency: "EUR" });

export function formatOwnerHorseMoney(value: number, currency: string): string {
  const formatter = currency === "EUR" ? euroFormatter
    : new Intl.NumberFormat("et-EE", { ...options, currency });
  return formatter.format(value);
}
