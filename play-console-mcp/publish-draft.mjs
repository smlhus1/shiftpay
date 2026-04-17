import { google } from "googleapis";
process.env.GOOGLE_APPLICATION_CREDENTIALS = "C:/Users/StianMelhus/.secrets/play-console-mcp.json";

const auth = new google.auth.GoogleAuth({ scopes: ["https://www.googleapis.com/auth/androidpublisher"] });
const pub = google.androidpublisher({ version: "v3", auth });

const packageName = "com.smlhus.shiftpay";
const track = "internal";

const { data: edit } = await pub.edits.insert({ packageName });
const editId = edit.id;
try {
  const cur = await pub.edits.tracks.get({ packageName, editId, track });
  const release = cur.data.releases[0];
  console.log("Current status:", release.status);
  release.status = "completed";
  delete release.userFraction;
  const res = await pub.edits.tracks.update({
    packageName, editId, track,
    requestBody: { track, releases: [release] },
  });
  console.log("Updated to:", res.data.releases[0].status);
  await pub.edits.commit({ packageName, editId });
  console.log("Committed.");
} catch (e) {
  await pub.edits.delete({ packageName, editId });
  throw e;
}
