import { existsSync } from "fs";
import { join } from "path";
import puppeteer from "puppeteer-core";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface ScreenshotJob {
  jobId: string;
  targetUrl: string;
  callbackUrl?: string;
}

function isLocalhostUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function getChromePath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.platform === "win32") {
    const paths = [
      join(process.env.ProgramFiles ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
      join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
    ];
    const found = paths.find((p) => existsSync(p));
    if (found) return found;
  } else {
    const paths = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
    const found = paths.find((p) => existsSync(p));
    if (found) return found;
  }
  throw new Error(
    "Chrome not found. Install Chrome or set PUPPETEER_EXECUTABLE_PATH to your Chrome executable."
  );
}

export async function captureAndUpload(job: ScreenshotJob): Promise<void> {
  const { jobId, targetUrl, callbackUrl } = job;
  const useLocalBrowser = isLocalhostUrl(targetUrl);

  if (useLocalBrowser) {
    console.log(`[${jobId}] Launching browser for: ${targetUrl}`);
  } else {
    console.log(`[${jobId}] Connecting to browserless for: ${targetUrl}`);
  }

  const browser = useLocalBrowser
    ? await puppeteer.launch({
        executablePath: getChromePath(),
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
    : await puppeteer.connect({
        browserWSEndpoint: `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`,
      });

  let screenshotUrl: string;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(targetUrl, { waitUntil: "load", timeout: 30000 });
    console.log(`[${jobId}] Page loaded, taking screenshot`);

    const buffer = await page.screenshot({ type: "png" });

    console.log(`[${jobId}] Uploading to Cloudinary`);
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: jobId, overwrite: true, resource_type: "image" },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result);
        }
      );

      stream.end(buffer);
    });

    screenshotUrl = result.secure_url;
    console.log(`[${jobId}] Uploaded: ${screenshotUrl}`);
  } finally {
    if (useLocalBrowser) {
      await browser.close();
    } else {
      await browser.disconnect();
    }
  }

  if (callbackUrl) {
    console.log(`[${jobId}] Sending callback to: ${callbackUrl}`);
    await fetch(callbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, screenshotUrl }),
    });
  }
}
