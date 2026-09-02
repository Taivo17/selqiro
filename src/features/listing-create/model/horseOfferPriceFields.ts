export type HorseSellerPriceMode =
  | "fixed"
  | "from"
  | "contact";

export type HorseWantedBudgetMode =
  | "maximum"
  | "contact";

export type HorseRecurringPricePeriod =
  | "day"
  | "week"
  | "month"
  | "agreed_period";

export type HorseSellerPriceFieldState = {
  mode: HorseSellerPriceMode;
  amount: string;
  currency: "EUR";
  period: HorseRecurringPricePeriod | null;
};

export type HorseWantedBudgetFieldState = {
  mode: HorseWantedBudgetMode;
  amount: string;
  currency: "EUR";
};

export type HorseOfferPriceFieldState = {
  sale: HorseSellerPriceFieldState;
  lease: HorseSellerPriceFieldState;
  coRider: HorseSellerPriceFieldState;
  wanted: HorseWantedBudgetFieldState;
};

export type HorseOfferPriceFieldChange =
  | {
      branch: "sale";
      patch: Partial<HorseSellerPriceFieldState>;
    }
  | {
      branch: "lease";
      patch: Partial<HorseSellerPriceFieldState>;
    }
  | {
      branch: "coRider";
      patch: Partial<HorseSellerPriceFieldState>;
    }
  | {
      branch: "wanted";
      patch: Partial<HorseWantedBudgetFieldState>;
    };

export const HORSE_OFFER_MONEY_INPUT_MAX_LENGTH =
  13;

export function isValidHorseMoneyInput(
  value: string
): boolean {
  return (
    value === ""
    || /^\d{1,10}([,.]\d{0,2})?$/.test(
      value
    )
  );
}

export function createHorseOfferPriceFieldState():
  HorseOfferPriceFieldState {
  return {
    sale: {
      mode: "contact",
      amount: "",
      currency: "EUR",
      period: null,
    },
    lease: {
      mode: "contact",
      amount: "",
      currency: "EUR",
      period: "month",
    },
    coRider: {
      mode: "contact",
      amount: "",
      currency: "EUR",
      period: "month",
    },
    wanted: {
      mode: "contact",
      amount: "",
      currency: "EUR",
    },
  };
}

export function applyHorseOfferPriceFieldChange(
  current: HorseOfferPriceFieldState,
  change: HorseOfferPriceFieldChange
): HorseOfferPriceFieldState {
  switch (change.branch) {
    case "sale":
      return {
        ...current,
        sale: {
          ...current.sale,
          ...change.patch,
        },
      };

    case "lease":
      return {
        ...current,
        lease: {
          ...current.lease,
          ...change.patch,
        },
      };

    case "coRider":
      return {
        ...current,
        coRider: {
          ...current.coRider,
          ...change.patch,
        },
      };

    case "wanted":
      return {
        ...current,
        wanted: {
          ...current.wanted,
          ...change.patch,
        },
      };

    default:
      return current;
  }
}
