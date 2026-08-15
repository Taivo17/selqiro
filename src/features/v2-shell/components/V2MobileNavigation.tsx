"use client";

import Link from "next/link";

export type V2MobileNavigationItemId =
  | "home"
  | "find"
  | "sell"
  | "messages"
  | "my-area";

type V2MobileNavigationItem = {
  id: V2MobileNavigationItemId;
  label: string;
  href: string;
  emphasized?: boolean;
};

const navigationItems: V2MobileNavigationItem[] = [
  {
    id: "home",
    label: "Avaleht",
    href: "/v2",
  },
  {
    id: "find",
    label: "Leia",
    href: "/v2/products",
  },
  {
    id: "sell",
    label: "Müü",
    href: "/sell",
    emphasized: true,
  },
  {
    id: "messages",
    label: "Sõnumid",
    href: "/messages",
  },
  {
    id: "my-area",
    label: "Minu ala",
    href: "/v2/my-area",
  },
];

export function shouldShowV2MobileNavigation(
  pathname: string | null
): boolean {
  if (!pathname?.startsWith("/v2")) {
    return false;
  }

  /*
   * Sügavamad tegevusvaated saavad hiljem
   * oma kontekstipõhise alumise tegevusriba.
   */
  const hiddenPrefixes = [
    "/v2/listing/",
    "/v2/showcase/",
    "/v2/service/",
    "/v2/my-area/listings/",
    "/v2/admin",
  ];

  return !hiddenPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );
}

function navigationItemIsActive(
  itemId: V2MobileNavigationItemId,
  pathname: string
): boolean {
  if (itemId === "home") {
    return pathname === "/v2";
  }

  if (itemId === "find") {
    return (
      pathname.startsWith("/v2/products") ||
      pathname.startsWith("/v2/services") ||
      pathname.startsWith("/v2/jobs")
    );
  }

  if (itemId === "sell") {
    return (
      pathname.startsWith("/sell") ||
      pathname.startsWith("/v2/sell")
    );
  }

  if (itemId === "messages") {
    return (
      pathname.startsWith("/messages") ||
      pathname.startsWith("/v2/messages")
    );
  }

  return (
    pathname.startsWith("/v2/my-area") ||
    pathname.startsWith("/v2/energy")
  );
}

function NavigationIcon({
  itemId,
}: {
  itemId: V2MobileNavigationItemId;
}) {
  const commonProps = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (itemId === "home") {
    return (
      <svg {...commonProps}>
        <path d="M3.5 10.8 12 3.8l8.5 7" />
        <path d="M5.5 9.8v10h13v-10" />
        <path d="M9.5 19.8v-6h5v6" />
      </svg>
    );
  }

  if (itemId === "find") {
    return (
      <svg {...commonProps}>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m15.5 15.5 4.5 4.5" />
      </svg>
    );
  }

  if (itemId === "sell") {
    return (
      <svg {...commonProps}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    );
  }

  if (itemId === "messages") {
    return (
      <svg {...commonProps}>
        <path d="M4 5.5h16v11H9l-5 3v-14Z" />
        <path d="M8 10h8" />
        <path d="M8 13h5" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function StandardNavigationItem({
  item,
  active,
}: {
  item: V2MobileNavigationItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={[
        "relative flex min-h-[62px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-center transition",
        active
          ? "text-neutral-950"
          : "text-neutral-400 hover:text-neutral-700",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-10 items-center justify-center rounded-full transition",
          active
            ? "bg-neutral-950 text-white shadow-sm"
            : "text-current",
        ].join(" ")}
      >
        <NavigationIcon itemId={item.id} />
      </span>

      <span className="max-w-full truncate text-[10px] font-black leading-3">
        {item.label}
      </span>

      {active ? (
        <span
          className="absolute bottom-0.5 h-1 w-1 rounded-full bg-emerald-500"
          aria-hidden="true"
        />
      ) : null}
    </Link>
  );
}

function SellNavigationItem({
  item,
}: {
  item: V2MobileNavigationItem;
}) {
  return (
    <Link
      href={item.href}
      aria-label="Lisa uus kuulutus"
      className="relative -mt-7 flex min-h-[82px] min-w-0 flex-col items-center justify-end gap-1 px-1 text-center"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_10px_28px_rgba(5,150,105,0.35)] ring-4 ring-white transition active:scale-95">
        <NavigationIcon itemId={item.id} />
      </span>

      <span className="text-[10px] font-black leading-3 text-neutral-800">
        {item.label}
      </span>
    </Link>
  );
}

export default function V2MobileNavigation({
  pathname,
}: {
  pathname: string;
}) {
  return (
    <nav
      aria-label="Mobiili põhimenüü"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-black/5 bg-white/95 shadow-[0_-8px_28px_rgba(0,0,0,0.06)] backdrop-blur-xl md:hidden"
      style={{
        paddingBottom:
          "max(env(safe-area-inset-bottom), 8px)",
      }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-0.5 px-2 pt-2">
        {navigationItems.map((item) => {
          if (item.emphasized) {
            return (
              <SellNavigationItem
                key={item.id}
                item={item}
              />
            );
          }

          return (
            <StandardNavigationItem
              key={item.id}
              item={item}
              active={navigationItemIsActive(
                item.id,
                pathname
              )}
            />
          );
        })}
      </div>
    </nav>
  );
}
