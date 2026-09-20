const nextConfig = {
  async redirects() {
    return [
      {
        // The challenge replaced the 3-Hand PLO Reality Check. Published links,
        // QR codes and already-sent emails point at the old path, and each one
        // carries the `?src=` content ID the whole funnel is attributed on, so
        // the redirect has to stay. Next preserves the query string.
        source: "/plo-reality-check",
        destination: "/plo-challenge",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
