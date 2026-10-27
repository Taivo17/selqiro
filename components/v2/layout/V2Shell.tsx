"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import V2Header from "./V2Header";
import V2MobileNavigation, {
  shouldShowV2MobileNavigation,
} from "../../../src/features/v2-shell/components/V2MobileNavigation";

type V2ShellProps = {
  children: ReactNode;
};

export default function V2Shell({
  children,
}: V2ShellProps) {
  const pathname = usePathname();

  const showMobileNavigation =
    shouldShowV2MobileNavigation(pathname);

  return (
    <div className="min-h-[100dvh] w-full overflow-x-clip bg-[#f7f8f6] text-neutral-950">
      <V2Header />

      <main
        className={[
          "mx-auto w-full min-w-0 max-w-7xl px-4 pt-6 sm:px-5 sm:pt-8",
          showMobileNavigation
            ? "pb-32 md:pb-8"
            : "pb-8",
        ].join(" ")}
      >
        {children}
      </main>

      {showMobileNavigation && pathname ? (
        <V2MobileNavigation
          pathname={pathname}
        />
      ) : null}
    </div>
  );
}
