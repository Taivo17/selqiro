"use client";
import {useState, type CSSProperties} from "react";
import {clampCoverFit, DEFAULT_COVER_FIT, type CoverFit} from "./coverFit";
import {profileImageSource} from "./profileImageUrl";

export function coverImageStyle(value: CoverFit): CSSProperties {
  const fit = clampCoverFit(value), position = `${fit.focus_x / 10}% ${fit.focus_y / 10}%`;
  // Scaling around the same object position keeps the normalized crop stable.
  return {objectPosition: position, transformOrigin: position, transform: `scale(${fit.zoom / 1000})`};
}
export default function ProfileCover({url, fit = DEFAULT_COVER_FIT, className = "h-56", localPreview, onDimensions}: {
  url: string | null | undefined; fit?: CoverFit; className?: string; localPreview?: string | null;
  onDimensions?: (width: number, height: number) => void;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const source = profileImageSource(url, localPreview);
  return <div className={`relative isolate overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-700 to-emerald-900 ${className}`}>
    {source && source !== failed
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={source} alt="" draggable={false} referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full select-none object-cover" style={coverImageStyle(fit)}
          onError={() => setFailed(source)} onLoad={event => onDimensions?.(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)} />
      : null}
  </div>;
}
