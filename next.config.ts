import type { NextConfig } from "next";

const publicationImageFiles = [
  "./src/server/listing-publication/images/sanitize.cjs",
  "./src/server/listing-publication/images/worker.cjs",
  "./src/server/listing-publication/images/image-contract.cjs",
  "./node_modules/sharp/**/*",
  "./node_modules/@img/colour/**/*",
  "./node_modules/@img/sharp-*/**/*",
  "./node_modules/detect-libc/**/*",
  "./node_modules/semver/**/*",
];

const nextConfig: NextConfig = {
  // Docker listens on 0.0.0.0; the browser uses this loopback host.
  allowedDevOrigins: ["127.0.0.1"],
  // The publication sanitizer deliberately uses native createRequire and a
  // child process, so Next cannot discover these runtime files statically.
  outputFileTracingIncludes: {
    "/api/v2/publication/*": publicationImageFiles,
    "/api/v2/horse-publication/*": publicationImageFiles,
    "/api/v2/service-publication/*": publicationImageFiles,
  },
};

export default nextConfig;
