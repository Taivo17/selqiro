import {
  getProductShowcaseActivity,
  type ProductShowcaseActivity,
} from "../../../entities/product-showcase/model/activity";
import type { ProductShowcase } from "../../../entities/product-showcase/model/types";

type ProductShowcaseActivityStatusProps = {
  showcase: ProductShowcase;
  now: number | null;
};

type ActivityPresentation = {
  label: string;
  message: string;
  className: string;
};

function formatActivityDate(
  value: string | null
): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("et-EE", {
    dateStyle: "medium",
  }).format(date);
}

function remainingDaysLabel(
  daysLeft: number
): string {
  return daysLeft === 1
    ? "1 päev"
    : `${daysLeft} päeva`;
}

function getActivityPresentation(
  activity: ProductShowcaseActivity
): ActivityPresentation | null {
  const dateLabel =
    formatActivityDate(
      activity.activeUntil
    );

  const daysLabel =
    remainingDaysLabel(
      activity.daysLeft || 0
    );

  if (activity.state === "active") {
    return {
      label: "Aktiivne",
      message:
        `Avalik kuni ${dateLabel}. ` +
        `Jäänud ${daysLabel}.`,
      className:
        "border-emerald-100 bg-emerald-50 text-emerald-800",
    };
  }

  if (activity.state === "warning") {
    return {
      label: "Aegub varsti",
      message:
        `Vaata info üle enne ${dateLabel}. ` +
        `Jäänud ${daysLabel}.`,
      className:
        "border-amber-200 bg-amber-50 text-amber-900",
    };
  }

  if (activity.state === "urgent") {
    return {
      label: "Aegub peagi",
      message:
        `Kontrolli infot enne ${dateLabel}. ` +
        `Jäänud ${daysLabel}.`,
      className:
        "border-orange-200 bg-orange-50 text-orange-900",
    };
  }

  if (activity.state === "expired") {
    return {
      label: "Aegunud",
      message:
        `Tähtaeg oli ${dateLabel}. ` +
        "Tootenäidis ei ole avalikus profiilis nähtav, " +
        "kuid jääb sinu Minu alasse alles.",
      className:
        "border-red-200 bg-red-50 text-red-900",
    };
  }

  if (activity.state === "invalid") {
    return {
      label: "Vajab kontrolli",
      message:
        "Aktiivsuse tähtaega ei saanud kuvada. " +
        "Värskenda lehte ja kontrolli tootenäidist uuesti.",
      className:
        "border-red-200 bg-red-50 text-red-900",
    };
  }

  return null;
}

export default function ProductShowcaseActivityStatus({
  showcase,
  now,
}: ProductShowcaseActivityStatusProps) {
  if (
    now === null ||
    showcase.status !== "published"
  ) {
    return null;
  }

  const activity =
    getProductShowcaseActivity(
      showcase,
      now
    );

  const presentation =
    getActivityPresentation(activity);

  if (!presentation) {
    return null;
  }

  return (
    <div
      className={[
        "mt-3 rounded-2xl border px-3.5 py-3",
        presentation.className,
      ].join(" ")}
    >
      <span className="inline-flex rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black">
        {presentation.label}
      </span>

      <p className="mt-2 text-xs font-semibold leading-5">
        {presentation.message}
      </p>
    </div>
  );
}
