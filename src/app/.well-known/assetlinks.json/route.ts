/**
 * /.well-known/assetlinks.json — Android App Links association.
 *
 * Lets the native app (package com.shweloaderbyvmsn.app) claim
 * https://shweloader.com.mm/product/* and /blogs/* so a shared link opens the
 * app when installed (autoVerify), falling back to the website when it isn't.
 *
 * The fingerprint is the EAS upload/signing key (from `eas credentials`). If the
 * app is distributed via Play with Play App Signing ON, ALSO add the Play app
 * signing key SHA-256 (Play Console → App integrity) to the array below — Android
 * verifies against the key the installed APK is actually signed with.
 *
 * Companion: apple-app-site-association (iOS) + app.config.ts associatedDomains/
 * intentFilters pointed at shweloader.com.mm, then a store rebuild.
 */
export function GET() {
  return Response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.shweloaderbyvmsn.app",
        sha256_cert_fingerprints: [
          // EAS upload/signing key (local + sideloaded builds)
          "E3:30:BC:7E:2E:D0:93:E5:A0:7B:26:AF:0F:84:C2:8B:D1:96:49:2C:EC:79:30:0E:28:26:88:54:E9:24:53:EA",
          // Play App Signing key (what Play-installed APKs are signed with)
          "9F:8F:49:5F:97:84:B6:96:6A:BB:E5:EB:CE:8E:3D:E7:F2:9A:DD:E7:6F:5B:68:97:D7:73:17:6C:54:63:E5:06",
        ],
      },
    },
  ]);
}
