import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pins the workspace root explicitly — otherwise Turbopack walks up looking for a
  // lockfile and finds an unrelated one in the user's home directory.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Allow HMR through the Cloudflare tunnel for local dev
  allowedDevOrigins: ["speaking-atlantic-blowing-techrepublic.trycloudflare.com"],
};

export default nextConfig;
