const puppeteer = require("puppeteer");
const fs = require("fs");
const { google } = require("googleapis");
const path = require("path");

const URL_TO_CAPTURE = "https://web.sensibull.com/verified-pnl/oculated-toy/live-positions"; // Replace with your target URL

async function main() {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto(URL_TO_CAPTURE, { waitUntil: "networkidle2" });

  // Wait for extra time (e.g., charts/tables)
  await page.waitForTimeout(5000);

  const fileName = `Screenshot-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
  const filePath = path.join("/tmp", fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  await browser.close();

  // Upload to Google Drive
  await uploadToDrive(filePath, fileName);
}

async function uploadToDrive(filePath, fileName) {
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json", // Service account credentials
    scopes: ["https://www.googleapis.com/auth/drive"]
  });

  const drive = google.drive({ version: "v3", auth });

  const fileMetadata = {
    name: fileName,
    parents: [process.env.DRIVE_FOLDER_ID] // Folder ID in Drive
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

  console.log(`Uploaded ${fileName} to Drive.`);
}

main();
