import { google } from "googleapis";

process.env.GOOGLE_APPLICATION_CREDENTIALS =
  "C:\\Users\\StianMelhus\\.secrets\\play-console-mcp.json";

const auth = new google.auth.GoogleAuth({
  scopes: ["https://www.googleapis.com/auth/androidpublisher"],
});

const pub = google.androidpublisher({ version: "v3", auth });

// RACK is the only app currently in Play Console
const packageName = "com.rack.app";

console.log(`[smoke] Calling reviews.list for ${packageName}...`);
try {
  const res = await pub.reviews.list({ packageName, maxResults: 5 });
  console.log("[smoke] ✅ auth works");
  console.log(
    `[smoke] Reviews found: ${res.data.reviews?.length ?? 0}`
  );
  if (res.data.reviews?.length) {
    console.log("[smoke] First review:", JSON.stringify(res.data.reviews[0], null, 2).slice(0, 500));
  }
} catch (e) {
  console.error(`[smoke] ❌ ${e.code ?? "?"}: ${e.message}`);
  if (e.errors) console.error(JSON.stringify(e.errors, null, 2));
  process.exit(1);
}

// Also try edits.insert → edits.delete to verify write-path auth
console.log(`[smoke] Testing edits.insert/delete...`);
try {
  const { data: edit } = await pub.edits.insert({ packageName });
  console.log(`[smoke] ✅ edits.insert ok, editId=${edit.id}`);
  await pub.edits.delete({ packageName, editId: edit.id });
  console.log(`[smoke] ✅ edits.delete ok`);
} catch (e) {
  console.error(`[smoke] ❌ edit test: ${e.code ?? "?"}: ${e.message}`);
  process.exit(1);
}

console.log("[smoke] All checks passed.");
