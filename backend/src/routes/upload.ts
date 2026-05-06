import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { monotonicFactory } from "ulid";
import { config } from "../config";
import { parseReceiptImage } from "../services/claude";
import { parseReceiptLlmOutput } from "../services/parser";
import { insertReceipt } from "../db";
import type { Receipt } from "@receipt-parser/shared";

const ulid = monotonicFactory();
const router = express.Router();

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadsDir),
  filename: (_req, _file, cb) => cb(null, `${ulid()}${path.extname(_file.originalname).toLowerCase()}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP`));
    }
  },
});

router.post("/", (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File too large. Maximum size is 10 MB." });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res, next) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No image uploaded. Send a file in the 'image' field." });
  }

  const imagePath = path.resolve(file.path);

  try {
    const rawLlmText = await parseReceiptImage(imagePath);
    const { receipt: parsedFields } = parseReceiptLlmOutput(rawLlmText);

    const now = new Date().toISOString();
    const receipt: Receipt = {
      id: ulid(),
      createdAt: now,
      updatedAt: now,
      imagePath,
      ...parsedFields,
    };

    insertReceipt(receipt);

    if (receipt.status === "parse_error") {
      return res.status(422).json({
        error: "parse_failed",
        raw: receipt.rawLlmOutput,
        partial: receipt,
      });
    }

    return res.status(201).json({ id: receipt.id, status: receipt.status, receipt });
  } catch (err) {
    fs.unlink(imagePath, () => {});
    next(err);  // Express 4 requires next(err) in async handlers — throw is not caught
  }
});

export default router;
