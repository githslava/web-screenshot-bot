const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

const puppeteer = require("puppeteer");
const fs = require("fs");
const { google } = require("googleapis");
const path = require("path");

const URL_TO_CAPTURE = "https://web.sensibull.com/verified-pnl/oculated-toy/live-positions"; // Replace with your URL

app.get("/", (req, res) => {
  res.send("✅ Screenshot bot is online!");
});

app.get("/run", async (req, res) => {
  try {
    await runBot();
    res.send("✅ Screenshot taken and uploaded.");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Failed to take screenshot.");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

async function runBot() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto(URL_TO_CAPTURE, { waitUntil: "networkidle2" });
  await page.waitForTimeout(5000);

  const date = new Date();
  const dateStr = date.toLocaleString("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).replace(/[:, ]/g, "-");

  const fileName = `Screenshot-${dateStr}.png`;
  const filePath = path.join("/tmp", fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  await browser.close();

  await uploadToDrive(filePath, fileName);
}

async function uploadToDrive(filePath, fileName) {
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    scopes: ["https://www.googleapis.com/auth/drive"]
  });

  const drive = google.drive({ version: "v3", auth });

  const fileMetadata = {
    name: fileName,
    parents: [process.env.DRIVE_FOLDER_ID]
  };

  const media = {
    mimeType: "image/png",
    body: fs.createReadStream(filePath)
  };

  await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id"
  });

  console.log(`✅ Uploaded ${fileName} to Drive.`);
}
