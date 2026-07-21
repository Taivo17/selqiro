"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import type { IdentitySummary } from "../../../entities/identity/model/types";
import { useV2IdentitySwitcher } from "../model/useV2IdentitySwitcher";

function identityTypeLabel(
  identity: IdentitySummary
) {
  return identity.type === "business"
    ? "Ettevõte"
    : "Eraisik";
}

function IdentityAvatar({
  identity,
  className,
}: {
  identity: IdentitySummary | null;
  className: string;
}) {
  if (identity?.avatarUrl) {
    return (
      <img
        src={identity.avatarUrl}
        alt=""
        className={[
          className,
          "shrink-0 rounded-full object-cover",
        ].join(" ")}
      />
    );
  }

  const initial =
    identity?.displayName
      .trim()
      .slice(0, 1)
      .toUpperCase() || "?";

  return (
    <span
      className={[
        className,
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-300 text-xs font-black text-neutral-600",
      ].join(" ")}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

function shouldReloadIdentityScopedRoute(
  pathname: string | null
): boolean {
  if (!pathname) return false;

  if (
    pathname === "/v2/my-area" ||
    pathname.startsWith(
      "/v2/my-area/"
    )
  ) {
    return true;
  }

  if (
    pathname === "/v2/energy" ||
    pathname.startsWith(
      "/v2/energy/"
    )
  ) {
    return true;
  }

  /*
   * Listing ownership and edit permissions depend on
   * the active identity, including the public listing
   * detail when the current viewer is its owner.
   */
  if (
    pathname.startsWith(
      "/v2/listing/"
    )
  ) {
    return true;
  }

  /*
   * Public profile content remains keyed by its URL
   * slug. Switching the viewer identity must not
   * replace or navigate away from that public profile.
   */
  return false;
}

export default function V2IdentityBadge({
  userId,
  userEmail,
}: {
  userId: string | null;
  userEmail?: string | null;
}) {
  const pathname = usePathname();

  const {
    identities,
    activeIdentity,
    loading,
    switchingIdentityId,
    error,
    switchIdentity,
  } = useV2IdentitySwitcher({
    userId,
    userEmail,
  });

  const [menuOpen, setMenuOpen] =
    useState(false);

  const rootRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(
      event: PointerEvent
    ) {
      const target =
        event.target as Node | null;

      if (
        target &&
        !rootRef.current?.contains(
          target
        )
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [menuOpen]);

  const label = loading
    ? "Laen..."
    : activeIdentity?.displayName ||
      userEmail?.split("@")[0] ||
      "Kasutaja";

  async function handleIdentityChange(
    identityId: string
  ) {
    if (
      identityId ===
      activeIdentity?.id
    ) {
      setMenuOpen(false);
      return;
    }

    try {
      const result =
        await switchIdentity(
          identityId
        );

      setMenuOpen(false);

      if (
        result.changed &&
        shouldReloadIdentityScopedRoute(
          pathname
        )
      ) {
        window.location.reload();
      }
    } catch {
      /*
       * The hook exposes the user-facing error inside
       * the open menu.
       */
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative"
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label="Vaheta aktiivset identiteeti"
        disabled={loading}
        onClick={() =>
          setMenuOpen(
            (current) => !current
          )
        }
        className="flex max-w-[145px] items-center gap-2 rounded-full border border-neutral-200 bg-white px-2.5 py-2 text-left text-sm shadow-sm transition hover:border-neutral-300 disabled:cursor-wait disabled:opacity-70 sm:max-w-[250px] sm:gap-3 sm:px-3"
      >
        <IdentityAvatar
          identity={activeIdentity}
          className="h-8 w-8 sm:h-9 sm:w-9"
        />

        <span className="min-w-0 flex-1">
          <span className="hidden text-[10px] uppercase tracking-[0.18em] text-neutral-400 sm:block">
            Tegutsen kui
          </span>

          <span className="block max-w-[64px] truncate font-semibold sm:max-w-[160px]">
            {label}
          </span>
        </span>

        <span
          aria-hidden="true"
          className={[
            "shrink-0 text-xs text-neutral-400 transition-transform",
            menuOpen
              ? "rotate-180"
              : "",
          ].join(" ")}
        >
          ⌄
        </span>
      </button>

      {menuOpen ? (
        <div
          role="menu"
          aria-label="Vali aktiivne identiteet"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[320px] max-w-[calc(100vw-2rem)] rounded-[24px] border border-black/10 bg-white p-3 shadow-2xl"
        >
          <div className="px-2 pb-3 pt-1">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
              Tegutsen kui
            </p>

            <p className="mt-1 text-sm font-black">
              Vali aktiivne identiteet
            </p>

            <p className="mt-1 text-xs leading-5 text-neutral-500">
              Aktiivne identiteet määrab Minu ala,
              kuulutuste ja omanikuvaadete sisu.
            </p>
          </div>

          <div className="space-y-2">
            {identities.map(
              (identity) => {
                const active =
                  activeIdentity?.id ===
                  identity.id;

                const switching =
                  switchingIdentityId ===
                  identity.id;

                return (
                  <button
                    key={identity.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    disabled={
                      Boolean(
                        switchingIdentityId
                      ) || active
                    }
                    onClick={() =>
                      void handleIdentityChange(
                        identity.id
                      )
                    }
                    className={[
                      "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-default",
                      active
                        ? "border-black bg-neutral-950 text-white"
                        : "border-neutral-200 bg-[#fbfbfa] text-neutral-950 hover:border-neutral-300 hover:bg-white",
                    ].join(" ")}
                  >
                    <IdentityAvatar
                      identity={identity}
                      className="h-10 w-10"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">
                        {identity.displayName}
                      </span>

                      <span
                        className={[
                          "mt-0.5 block text-xs",
                          active
                            ? "text-white/60"
                            : "text-neutral-500",
                        ].join(" ")}
                      >
                        {switching
                          ? "Vahetan..."
                          : identityTypeLabel(
                              identity
                            )}
                      </span>
                    </span>

                    {active ? (
                      <span
                        className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-black"
                        aria-hidden="true"
                      >
                        ✓ Aktiivne
                      </span>
                    ) : (
                      <span
                        className="shrink-0 text-lg text-neutral-300"
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>

          {!loading &&
          identities.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-[#fbfbfa] p-4">
              <p className="text-sm font-black">
                Identiteete ei leitud
              </p>

              <p className="mt-1 text-xs leading-5 text-neutral-500">
                Kontol puudub aktiivne era- või
                ettevõtteidentiteet.
              </p>
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-3"
            >
              <p className="text-xs font-black text-red-950">
                Identiteeti ei saanud vahetada
              </p>

              <p className="mt-1 text-xs leading-5 text-red-800">
                {error}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
