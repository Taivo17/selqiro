import { getOfferTheme, offerButtonLayout } from "../../../shared/marketplace/offerTheme";
export const jobButton = `${offerButtonLayout} ${getOfferTheme("job").button} disabled:cursor-not-allowed disabled:opacity-50`;
export const jobSecondary = "inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-300 bg-white px-5 py-3 text-sm font-bold text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:opacity-50";
export const jobField = "mt-2 min-h-11 w-full min-w-0 rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base font-normal text-neutral-950 focus:border-blue-600 focus:outline-blue-600 disabled:bg-neutral-100";
export const jobPanel = "min-w-0 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-7";
