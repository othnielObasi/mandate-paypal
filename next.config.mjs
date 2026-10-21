/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep native/Node-only database drivers out of the bundle.
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
};

export default nextConfig;
