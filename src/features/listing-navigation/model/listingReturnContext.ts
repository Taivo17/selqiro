export type ListingReturnSource =
  | "products"
  | "public-profile";

export type ListingReturnContext = {
  version: 1;
  token: string;
  source: ListingReturnSource;
  sourceUrl: string;
  listingId: string;
  scrollY: number;
  cardViewportTop: number;
  createdAt: number;
};

const STORAGE_KEY =
  "selqiro:listing-return-context:v1";

const FALLBACK_INTENT_KEY =
  "selqiro:listing-return-intent:v1";

const HISTORY_TOKEN_KEY =
  "__selqiroListingReturnToken";

const CONTEXT_MAX_AGE_MS =
  2 * 60 * 60 * 1000;

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function safeSessionGet(
  key: string
): string | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  try {
    return window.sessionStorage.getItem(
      key
    );
  } catch {
    return null;
  }
}

function safeSessionSet(
  key: string,
  value: string
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      key,
      value
    );
  } catch {
    /*
     * Navigation must remain usable even when
     * storage is blocked by browser settings.
     */
  }
}

function safeSessionRemove(
  key: string
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  try {
    window.sessionStorage.removeItem(
      key
    );
  } catch {
    /*
     * Ignore unavailable session storage.
     */
  }
}

function createReturnToken(): string {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2),
  ].join("-");
}

function normalizeFiniteNumber(
  value: unknown
): number | null {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function normalizeSourceUrl(
  value: unknown,
  source: ListingReturnSource
): string | null {
  if (
    typeof window === "undefined" ||
    typeof value !== "string"
  ) {
    return null;
  }

  try {
    const parsed = new URL(
      value,
      window.location.origin
    );

    if (
      parsed.origin !==
      window.location.origin
    ) {
      return null;
    }

    if (
      source === "products" &&
      parsed.pathname !==
        "/v2/products"
    ) {
      return null;
    }

    if (
      source ===
        "public-profile" &&
      !parsed.pathname.startsWith(
        "/v2/profile/"
      )
    ) {
      return null;
    }

    return [
      parsed.pathname,
      parsed.search,
      parsed.hash,
    ].join("");
  } catch {
    return null;
  }
}

function normalizeContext(
  value: unknown
): ListingReturnContext | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.version !== 1) {
    return null;
  }

  const source =
    value.source === "products" ||
    value.source ===
      "public-profile"
      ? value.source
      : null;

  if (!source) {
    return null;
  }

  const token =
    typeof value.token === "string"
      ? value.token.trim()
      : "";

  const listingId =
    typeof value.listingId ===
    "string"
      ? value.listingId.trim()
      : "";

  const sourceUrl =
    normalizeSourceUrl(
      value.sourceUrl,
      source
    );

  const scrollY =
    normalizeFiniteNumber(
      value.scrollY
    );

  const cardViewportTop =
    normalizeFiniteNumber(
      value.cardViewportTop
    );

  const createdAt =
    normalizeFiniteNumber(
      value.createdAt
    );

  if (
    !token ||
    token.length > 160 ||
    !listingId ||
    listingId.length > 160 ||
    !sourceUrl ||
    scrollY === null ||
    cardViewportTop === null ||
    createdAt === null
  ) {
    return null;
  }

  if (
    Date.now() - createdAt >
      CONTEXT_MAX_AGE_MS ||
    createdAt >
      Date.now() + 60_000
  ) {
    return null;
  }

  return {
    version: 1,
    token,
    source,
    sourceUrl,
    listingId,
    scrollY: Math.max(
      0,
      scrollY
    ),
    cardViewportTop,
    createdAt,
  };
}

export function
getCurrentRelativeUrl(): string {
  if (
    typeof window === "undefined"
  ) {
    return "";
  }

  return [
    window.location.pathname,
    window.location.search,
    window.location.hash,
  ].join("");
}

export function
saveListingReturnContext(input: {
  source: ListingReturnSource;
  listingId: string;
  cardViewportTop: number;
}): ListingReturnContext | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const listingId =
    input.listingId.trim();

  if (!listingId) {
    return null;
  }

  const sourceUrl =
    normalizeSourceUrl(
      getCurrentRelativeUrl(),
      input.source
    );

  if (!sourceUrl) {
    return null;
  }

  const context:
    ListingReturnContext = {
      version: 1,
      token:
        createReturnToken(),
      source: input.source,
      sourceUrl,
      listingId,
      scrollY: Math.max(
        0,
        window.scrollY
      ),
      cardViewportTop:
        Number.isFinite(
          input.cardViewportTop
        )
          ? input.cardViewportTop
          : 0,
      createdAt: Date.now(),
    };

  safeSessionSet(
    STORAGE_KEY,
    JSON.stringify(context)
  );

  const historyState =
    isRecord(
      window.history.state
    )
      ? window.history.state
      : {};

  window.history.replaceState(
    {
      ...historyState,
      [HISTORY_TOKEN_KEY]:
        context.token,
    },
    "",
    window.location.href
  );

  return context;
}

export function
readListingReturnContext(
  listingId?: string | null
): ListingReturnContext | null {
  const raw =
    safeSessionGet(
      STORAGE_KEY
    );

  if (!raw) {
    return null;
  }

  try {
    const context =
      normalizeContext(
        JSON.parse(raw)
      );

    if (!context) {
      safeSessionRemove(
        STORAGE_KEY
      );
      safeSessionRemove(
        FALLBACK_INTENT_KEY
      );

      return null;
    }

    const expectedListingId =
      listingId?.trim() || "";

    if (
      expectedListingId &&
      context.listingId !==
        expectedListingId
    ) {
      return null;
    }

    return context;
  } catch {
    safeSessionRemove(
      STORAGE_KEY
    );
    safeSessionRemove(
      FALLBACK_INTENT_KEY
    );

    return null;
  }
}

export function
isListingReturnNavigation(
  context: ListingReturnContext
): boolean {
  if (
    typeof window === "undefined"
  ) {
    return false;
  }

  const historyState =
    isRecord(
      window.history.state
    )
      ? window.history.state
      : {};

  const historyToken =
    historyState[
      HISTORY_TOKEN_KEY
    ];

  if (
    historyToken ===
      context.token
  ) {
    return true;
  }

  return (
    safeSessionGet(
      FALLBACK_INTENT_KEY
    ) === context.token
  );
}

export function
markListingReturnFallbackNavigation(
  context: ListingReturnContext
) {
  safeSessionSet(
    FALLBACK_INTENT_KEY,
    context.token
  );
}

export function
clearListingReturnContext(
  context?: ListingReturnContext | null
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const stored =
    readListingReturnContext();

  if (
    !context ||
    !stored ||
    stored.token ===
      context.token
  ) {
    safeSessionRemove(
      STORAGE_KEY
    );
  }

  const fallbackToken =
    safeSessionGet(
      FALLBACK_INTENT_KEY
    );

  if (
    !context ||
    fallbackToken ===
      context.token
  ) {
    safeSessionRemove(
      FALLBACK_INTENT_KEY
    );
  }

  const historyState =
    isRecord(
      window.history.state
    )
      ? window.history.state
      : {};

  if (
    !context ||
    historyState[
      HISTORY_TOKEN_KEY
    ] === context.token
  ) {
    const {
      [HISTORY_TOKEN_KEY]:
        _removedToken,
      ...nextHistoryState
    } = historyState;

    window.history.replaceState(
      nextHistoryState,
      "",
      window.location.href
    );
  }
}

export function
getListingReturnBackLabel(
  context:
    | ListingReturnContext
    | null
): string {
  return context?.source ===
    "public-profile"
    ? "← Tagasi profiilile"
    : "← Tagasi toodete juurde";
}
