import { Router, Request, Response } from "express";
import { waitUntil } from "@vercel/functions";
import { captureAndUpload } from "../services/captureAndUpload";

const router = Router();

router.post("/", (req: Request, res: Response): void => {
  const { jobId, targetUrl, callbackUrl } = req.body as {
    jobId: string;
    targetUrl: string;
    callbackUrl?: string;
  };

  if (!jobId || !targetUrl) {
    res.status(400).json({ error: "jobId and targetUrl are required" });
    return;
  }

  res.status(202).json({ status: "accepted", jobId });

  waitUntil(
    captureAndUpload({ jobId, targetUrl, callbackUrl }).catch((err) => {
      console.error(`[${jobId}] Failed:`, err);
    })
  );
});

export default router;
