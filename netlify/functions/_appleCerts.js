// Apple root CA certificates used by @apple/app-store-server-library
// to verify JWS signatures coming from StoreKit 2 purchases and
// App Store Server Notifications v2.
//
// The certs are public (published by Apple at
// https://www.apple.com/certificateauthority/) but must be provided
// at runtime as Buffer[]. We read them from base64-encoded Netlify
// env vars so the binary .cer files never need to sit in the repo.
//
// Expected env vars (set in Netlify → Site configuration →
// Environment variables):
//   APPLE_ROOT_CA_G3_B64         — AppleRootCA-G3.cer  (ECC)
//   APPLE_INC_ROOT_CERT_B64      — AppleIncRootCertificate.cer (RSA, legacy)
//
// To obtain them on a machine with internet access:
//   curl -o AppleRootCA-G3.cer https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
//   curl -o AppleIncRootCertificate.cer https://www.apple.com/certificateauthority/AppleIncRootCertificate.cer
//   base64 -w 0 AppleRootCA-G3.cer        # Linux
//   base64 -i AppleRootCA-G3.cer          # macOS
// Paste each base64 string into the corresponding env var.

export function getAppleRootCertificates() {
  const g3 = process.env.APPLE_ROOT_CA_G3_B64;
  const inc = process.env.APPLE_INC_ROOT_CERT_B64;
  const out = [];
  if (g3) out.push(Buffer.from(g3, "base64"));
  if (inc) out.push(Buffer.from(inc, "base64"));
  return out;
}
