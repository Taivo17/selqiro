"use client";

type IdentityPlan = "free" | "premium" | "business";

type MembershipCardProps = {
  t: (key: string) => string;
  inputClass: string;
  labelClass: string;
  userEmail?: string | null;
  adminEmail: string;
  identityPlan: IdentityPlan;
  premiumActive: boolean;
  activeListingsCount: number;
  inviteCode: string;
  setInviteCode: (value: string) => void;
  claimPremiumInvite: () => void;
  claimingInvite: boolean;
  claimMessage: string;
  createPremiumInvite: () => void;
  creatingInvite: boolean;
  generatedCode: string;
};

export default function MembershipCard({
  t,
  inputClass,
  labelClass,
  userEmail,
  adminEmail,
  identityPlan,
  premiumActive,
  activeListingsCount,
  inviteCode,
  setInviteCode,
  claimPremiumInvite,
  claimingInvite,
  claimMessage,
  createPremiumInvite,
  creatingInvite,
  generatedCode,
}: MembershipCardProps) {
  const isBusiness = identityPlan === "business";

  return (
    <section
      className={`rounded-[28px] p-5 shadow-sm sm:p-6 ${
        premiumActive
          ? "border border-amber-200/70 bg-gradient-to-br from-amber-50/60 via-white to-white shadow-[0_6px_20px_rgba(251,191,36,0.15)]"
          : "bg-white"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.22em] text-black/35">
            {t("myPage.account")}
          </p>

          <h2 className="text-2xl font-semibold tracking-tight">
            {premiumActive ? t("myPage.premiumAccount") : t("myPage.freeAccount")}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            {premiumActive
              ? isBusiness
                ? "Business account active."
                : t("myPage.premiumAccount")
              : t("myPage.freeAccountLimit").replace("{count}", String(activeListingsCount))}
          </p>

          {!premiumActive && activeListingsCount >= 50 && (
            <p className="mt-2 text-sm font-medium text-yellow-700">
              Free listing limit reached. Existing listings stay active until
              their 90-day expiry, but new listings need Premium or fewer than
              50 active listings.
            </p>
          )}
        </div>

        <div className="w-full max-w-md">
          <label className={labelClass}>{t("myPage.premiumInviteCode")}</label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder={t("myPage.enterInviteCode")}
              className={inputClass}
            />

            <button
              type="button"
              onClick={claimPremiumInvite}
              disabled={claimingInvite}
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {claimingInvite ? t("myPage.activating") : t("myPage.activate")}
            </button>
          </div>

          {claimMessage && (
            <p className="mt-2 text-sm text-black/55">{claimMessage}</p>
          )}

          {userEmail === adminEmail && (
            <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
              <p className="mb-2 text-sm font-semibold">{t("myPage.admin")}</p>

              <button
                type="button"
                onClick={createPremiumInvite}
                disabled={creatingInvite}
                className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
              >
                {creatingInvite
                  ? t("myPage.creating")
                  : t("myPage.generatePremiumInvite")}
              </button>

              {generatedCode && (
                <div className="mt-3 rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white">
                  {t("myPage.code")}: {generatedCode}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
