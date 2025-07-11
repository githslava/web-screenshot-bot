const express = require("express");
const app = express();
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

const PORT = process.env.PORT || 3000;
const TARGET_URL = "https://web.sensibull.com/verified-pnl/oculated-toy/live-positions";
const TIMEZONE = "Asia/Kolkata";

// ✅ Helper: Write base64 credentials to file
function writeCredentialsFile() {
  const credentialsBase64 = process.env.GOOGLE_CREDENTIALS;
  const credentialsPath = "/tmp/credentials.json";

  if (!credentialsBase64) {
    throw new Error("❌ Missing GOOGLE_CREDENTIALS environment variable.");
  }

  if (!fs.existsSync(credentialsPath)) {
    fs.writeFileSync(credentialsPath, Buffer.from(credentialsBase64, "base64").toString("utf-8"));
    console.log("✅ credentials.json written to /tmp");
  }

  return credentialsPath;
}

// ✅ Route: Health check
app.get("/", (req, res) => {
  res.send("✅ Screenshot bot is online and ready!");
});

// ✅ Route: Trigger screenshot and upload
app.get("/run", async (req, res) => {
  try {
    await takeScreenshot();
    res.send("✅ Screenshot taken and uploaded to Google Drive.");
  } catch (err) {
    console.error("❌ Error during /run:", err);
    res.status(500).send("❌ Failed to take or upload screenshot.");
  }
});

// ✅ Launch server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

// ✅ Screenshot + upload logic
async function takeScreenshot() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
  await page.waitForTimeout(5000); // wait for dynamic content to load

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    timeZone: TIMEZONE,
    day: "2-digit", month: "short", year: "2-digit"
  }).replace(/ /g, "-");

  const timeStr = now.toLocaleTimeString("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit", minute: "2-digit",
    hour12: false
  }).replace(/:/g, "");

  const fileName = `Screenshot-${dateStr}-${timeStr}.png`;
  const filePath = path.join("/tmp", fileName);

  await page.screenshot({ path: filePath, fullPage: true });
  await browser.close();

  await uploadToDrive(filePath, fileName);
}

// ✅ Upload screenshot to Google Drive
async function uploadToDrive(filePath, fileName) {
  const credentialsPath = writeCredentialsFile();
  const folderId = process.env.DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error("❌ Missing DRIVE_FOLDER_ID environment variable.");
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: credentialsPath,
    scopes: ["https://www.googleapis.com/auth/drive"]
  });

  const drive = google.drive({ version: "v3", auth });

  const fileMetadata = {
    name: fileName,
    parents: [folderId]
  };

  const media = {
    mimeType: "image/png",
    body: fs.createReadStream(filePath)
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id"
  });

  console.log(`✅ Uploaded ${fileName} to Drive. File ID: ${file.data.id}`);
}
