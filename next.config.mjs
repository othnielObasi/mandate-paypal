/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep native/Node-only database drivers out of the bundle.
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  // The APIMatic-generated API portal is static files in public/docs (npm run docs:generate).
  // Its pages are folders with an index.html: serve them at /docs/... after real files are tried.
  async rewrites() {
    return {
      afterFiles: [
        { source: "/docs", destination: "/docs/index.html" },
        { source: "/docs/:path*", destination: "/docs/:path*/index.html" },
      ],
    };
  },
};

export default nextConfig;
