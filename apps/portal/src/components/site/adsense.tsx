"use client";

import Script from "next/script";
import { useEffect } from "react";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

/**
 * Loads the Google AdSense library. Env-gated on NEXT_PUBLIC_ADSENSE_CLIENT
 * (format "ca-pub-XXXXXXXXXXXXXXXX"), so it's a no-op until the account is
 * approved and the id is set. With the script loaded, AdSense Auto Ads work
 * on their own; manual placements below activate when their slot ids are set.
 */
export function AdSenseScript() {
  if (!CLIENT) return null;
  return (
    <Script
      id="adsbygoogle-js"
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`}
    />
  );
}

/**
 * A single responsive ad unit with reserved height to avoid layout shift (CLS).
 * Renders nothing until both the client id and this unit's slot id are set,
 * so the reader never sees an empty ad box before AdSense is live.
 */
export function AdSlot({
  slot,
  format = "auto",
  className,
}: {
  slot?: string;
  format?: string;
  className?: string;
}) {
  useEffect(() => {
    if (!CLIENT || !slot) return;
    try {
      // @ts-expect-error adsbygoogle is injected by the AdSense script at runtime
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ignore: ad fill is best-effort */
    }
  }, [slot]);

  if (!CLIENT || !slot) return null;

  return (
    <div className={`ad-slot${className ? " " + className : ""}`}>
      <span className="ad-slot__label">Publicidade</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
