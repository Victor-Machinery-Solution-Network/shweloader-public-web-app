/**
 * /.well-known/apple-app-site-association — iOS Universal Links association.
 *
 * Lets the native app (bundle com.shweloaderbyvmsn.app, Apple team CNV82B8ZRN)
 * claim https://shweloader.com.mm/product/* and /blogs/* so a shared link opens
 * the app when installed, falling back to the website when it isn't.
 *
 * Route handler (not a public/ static file) so the content-type is guaranteed
 * application/json — matches the llms.txt/robots/sitemap convention.
 *
 * Companion: assetlinks.json (Android) + app.config.ts associatedDomains/
 * intentFilters repointed to shweloader.com.mm, then a store rebuild.
 */
export function GET() {
  return Response.json({
    applinks: {
      apps: [],
      details: [
        {
          appID: "CNV82B8ZRN.com.shweloaderbyvmsn.app",
          paths: ["/product/*", "/blogs/*"],
        },
      ],
    },
  });
}
