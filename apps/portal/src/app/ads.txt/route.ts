// AdSense ads.txt — authorizes Google to sell this site's inventory.
// Env-gated: emits the line only when NEXT_PUBLIC_ADSENSE_CLIENT ("ca-pub-XXXX") is set.
export const revalidate = 3600;

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const pub = client?.replace(/^ca-/, ""); // ads.txt uses "pub-XXXX"
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : "";
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
