import { Pool } from "pg";
import { logger } from "./logger";
import fs from "fs";
import * as AWSXRay from "aws-xray-sdk";
import dotenv from "dotenv";

dotenv.config();

const tracedPg = AWSXRay.capturePostgres(require("pg"));

export const pool = new tracedPg.Pool({
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
  const subsegment = AWSXRay.getSegment()?.addNewSubsegment("DBConnect");
  try {
    const client = await pool.connect();
    subsegment?.close();
    return { pool, client };
  } catch (e: any) {
    subsegment?.addError(e);
    subsegment?.close();
    throw e;
  }
};
