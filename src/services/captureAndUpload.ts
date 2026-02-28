import puppeteer from "puppeteer";
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

export async function captureAndUpload(job: ScreenshotJob): Promise<void> {
  const { jobId, targetUrl, callbackUrl } = job;

  console.log(`[${jobId}] Launching browser for: ${targetUrl}`);
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let screenshotUrl: string;

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(targetUrl, { waitUntil: "networkidle2" });
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
    await browser.close();
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
