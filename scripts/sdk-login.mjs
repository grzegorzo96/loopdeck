// Interactive SDK login — mints a user API key into ~/.cursor/sdk/auth.json
// Usage: npm run sdk:login

import { Cursor } from "@cursor/sdk";

console.log("Opening Cursor login in your browser…");
console.log("(Set NO_OPEN_BROWSER=1 to print the URL instead.)\n");

const result = await Cursor.auth.login({
  apiKeyName: "loopdeck-sdk-verify",
  openBrowser: process.env.NO_OPEN_BROWSER !== "1",
  onLoginUrl: (url) => {
    console.log("Login URL:", url);
  },
});

console.log("\n✅ Logged in.");
console.log(`   Email: ${result.email ?? "(unknown)"}`);
console.log(`   Key expires: ${new Date(result.apiKeyExpiresAtMs).toISOString()}`);
console.log("\nRun: npm run sdk:verify");
