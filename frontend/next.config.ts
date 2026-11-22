import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const publicProduction = process.env.VERCEL_ENV === "production";
const requestedMode = process.env.NEXT_PUBLIC_SITE_MODE;
// A public build without a deliberate live configuration uses the existing opening page.
const siteMode = publicProduction && requestedMode !== "live" ? "launch" : requestedMode;

const hosted = publicProduction || process.env.VERCEL_ENV === "preview";
if (hosted && siteMode === "live") {
  for (const [name, value] of [
    ["NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL],
    ["NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL],
  ]) {
    const origin = URL.parse(value ?? "");
    const local = origin && (origin.hostname === "localhost" || origin.hostname.endsWith(".localhost") ||
      origin.hostname.startsWith("127.") || ["[::1]", "0.0.0.0"].includes(origin.hostname));
    if (!origin || origin.protocol !== "https:" || local || origin.username || origin.password ||
        origin.pathname !== "/" || origin.search || origin.hash) {
      throw new Error(`BORÉALE : ${name} doit être une origine HTTPS distante en mode connecté sur Vercel.`);
    }
  }
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // L'admin et le checkout n'ont pas vocation à être embarqués
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  ...(siteMode ? { env: { NEXT_PUBLIC_SITE_MODE: siteMode } } : {}),
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Les pages privées ne doivent jamais être indexées, même en cas d'oubli de noindex
        source: "/(admin|checkout|account|order)(/.*)?",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
