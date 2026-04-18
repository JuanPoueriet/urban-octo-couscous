module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'npm run serve:ssr:app',
      url: [
        'http://localhost:4000/en/home',
        'http://localhost:4000/en/solutions',
        'http://localhost:4000/en/blog',
        'http://localhost:4000/en/about-us'
      ],
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.85 }],
        'categories:best-practices': ['error', { minScore: 0.8 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.5 }],
        'total-blocking-time': ['warn', { maxNumericValue: 500 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
