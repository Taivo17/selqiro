"use client";
import {useState} from "react";
import {profileImageSource, profileInitial} from "./profileImageUrl";

export default function ProfileAvatar({url, name, className = "h-10 w-10", localPreview}: {
  url: string | null | undefined; name: string | null | undefined; className?: string; localPreview?: string | null;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const source = profileImageSource(url, localPreview);
  return <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 font-bold text-neutral-600 ${className}`}>
    {source && source !== failed
      // Profile media are already resized; direct delivery avoids a second cache of a removed image.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={source} alt="" draggable={false} referrerPolicy="no-referrer" className="h-full w-full object-contain" style={{objectFit: "contain"}}
          onError={() => setFailed(source)} />
      : profileInitial(name)}
  </span>;
}
