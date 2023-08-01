import { Pool } from "pg";
import { logger } from "./logger";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  host: process.env.RDS_HOST,
  user: process.env.RDS_USER,
  database: process.env.RDS_DB,
  password: process.env.RDS_PASSWORD,
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: {
    ca: fs.readFileSync("./us-east-1-bundle.pem").toString(),
  },
});

export const createDbConnection = async () => {
  logger.info("Connecting to database...");
  const client = await pool.connect();
  return { pool, client };
};
