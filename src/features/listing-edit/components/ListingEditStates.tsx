"use client";

import Link from "next/link";
import { PlaceholderImage } from "./ListingEditPrimitives";

export function LoadingState() {
  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-8 shadow-sm">
      <div className="h-8 w-64 rounded-full bg-neutral-100" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <PlaceholderImage className="h-80" />
        <div className="space-y-3">
          <div className="h-24 rounded-2xl bg-neutral-100" />
          <div className="h-24 rounded-2xl bg-neutral-100" />
          <div className="h-24 rounded-2xl bg-neutral-100" />
        </div>
      </div>
    </section>
  );
}

export function MessageState({
  title,
  text,
  actionHref,
  actionLabel,
}: {
  title: string;
  text: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <section className="rounded-[34px] border border-black/5 bg-white p-8 text-center shadow-sm">
      <h1 className="text-3xl font-black">{title}</h1>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-500">
        {text}
      </p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex rounded-full bg-black px-5 py-3 text-sm font-black text-white"
      >
        {actionLabel}
      </Link>
    </section>
  );
}
