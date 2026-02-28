import "dotenv/config";
import express from "express";
import { authMiddleware } from "./middleware/auth";
import screenshotRouter from "./routes/screenshot";

const app = express();
const PORT = process.env.PORT ?? 8080;

app.use(express.json());
app.use("/screenshot", authMiddleware, screenshotRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
