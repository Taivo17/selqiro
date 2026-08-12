export type MyAreaContentType =
  | "showcase"
  | "service";

export type MyAreaContentReturnContext = {
  version: 1;
  token: string;
  contentType: MyAreaContentType;
  contentId: string;
  sourceUrl: string;
  scrollY: number;
  cardViewportTop: number;
  createdAt: number;
};

const STORAGE_KEY =
  "selqiro:my-area-content-return-context:v1";

const FALLBACK_INTENT_KEY =
  "selqiro:my-area-content-return-intent:v1";

const HISTORY_TOKEN_KEY =
  "__selqiroMyAreaContentReturnToken";

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
     * Navigeerimine peab töötama ka siis,
     * kui brauser blokeerib sessionStorage'i.
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
     * Puuduv salvestusruum ei tohi
     * tagasinavigatsiooni rikkuda.
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

function normalizeContentType(
  value: unknown
): MyAreaContentType | null {
  if (
    value === "showcase" ||
    value === "service"
  ) {
    return value;
  }

  return null;
}

export function
getCurrentMyAreaRelativeUrl(): string {
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

function normalizeSourceUrl(
  value: unknown
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
        window.location.origin ||
      parsed.pathname !==
        "/v2/my-area"
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
): MyAreaContentReturnContext | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.version !== 1) {
    return null;
  }

  const token =
    typeof value.token === "string"
      ? value.token.trim()
      : "";

  const contentType =
    normalizeContentType(
      value.contentType
    );

  const contentId =
    typeof value.contentId === "string"
      ? value.contentId.trim()
      : "";

  const sourceUrl =
    normalizeSourceUrl(
      value.sourceUrl
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
    !contentType ||
    !contentId ||
    contentId.length > 160 ||
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
    createdAt > Date.now() + 60_000
  ) {
    return null;
  }

  return {
    version: 1,
    token,
    contentType,
    contentId,
    sourceUrl,
    scrollY: Math.max(
      0,
      scrollY
    ),
    cardViewportTop,
    createdAt,
  };
}

export function
saveMyAreaContentReturnContext(input: {
  contentType: MyAreaContentType;
  contentId: string;
  cardViewportTop: number;
}): MyAreaContentReturnContext | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  const contentId =
    input.contentId.trim();

  const sourceUrl =
    normalizeSourceUrl(
      getCurrentMyAreaRelativeUrl()
    );

  if (!contentId || !sourceUrl) {
    return null;
  }

  const context:
    MyAreaContentReturnContext = {
      version: 1,
      token: createReturnToken(),
      contentType:
        input.contentType,
      contentId,
      sourceUrl,
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
readMyAreaContentReturnContext():
  | MyAreaContentReturnContext
  | null {
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
isMyAreaContentReturnNavigation(
  context: MyAreaContentReturnContext
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

  if (
    historyState[
      HISTORY_TOKEN_KEY
    ] === context.token
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
markMyAreaContentReturnFallbackNavigation(
  input: {
    contentType: MyAreaContentType;
    contentId: string;
  }
) {
  const context =
    readMyAreaContentReturnContext();

  if (
    !context ||
    context.contentType !==
      input.contentType ||
    context.contentId !==
      input.contentId.trim()
  ) {
    return;
  }

  safeSessionSet(
    FALLBACK_INTENT_KEY,
    context.token
  );
}

export function
clearMyAreaContentReturnContext(
  context: MyAreaContentReturnContext
) {
  const current =
    readMyAreaContentReturnContext();

  if (
    current?.token ===
      context.token
  ) {
    safeSessionRemove(
      STORAGE_KEY
    );
  }

  if (
    safeSessionGet(
      FALLBACK_INTENT_KEY
    ) === context.token
  ) {
    safeSessionRemove(
      FALLBACK_INTENT_KEY
    );
  }
}
