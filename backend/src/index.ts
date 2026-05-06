import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "./config";
import uploadRouter from "./routes/upload";
import receiptsRouter from "./routes/receipts";
import { errorHandler } from "./middleware/errorHandler";

// Ensure uploads directory exists
fs.mkdirSync(config.uploadsDir, { recursive: true });

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Serve uploaded images
app.use("/uploads", express.static(config.uploadsDir));

app.use("/api/upload", uploadRouter);
app.use("/api/receipts", receiptsRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
