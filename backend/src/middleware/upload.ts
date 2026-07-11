import multer from "multer";
import { ApiError } from "./errorHandler";

const MAX_FILE_SIZE_MB = Number(process.env.MAX_CSV_SIZE_MB || 10);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");

    if (!isCsv) {
      return cb(new ApiError(400, "Only .csv files are accepted."));
    }
    cb(null, true);
  },
});
