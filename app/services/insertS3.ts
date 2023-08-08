import { S3Client, PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import { logger } from "./logger";
import * as AWSXRay from "aws-xray-sdk";

export async function insertS3(image: Express.Multer.File[]) {
  const segment = AWSXRay.getSegment();
  if (!segment) {
    throw new Error("X-Ray segment not found");
  }
  const s3 = AWSXRay.captureAWSv3Client(
    new S3Client({ region: "us-east-1" }),
    segment
  );
  const subsegment = AWSXRay.getSegment()?.addNewSubsegment("S3Upload");
  const data = image;
  logger.info("Uploading image to S3...");
  try {
    let resultArr = [];
    for (const imageFile of image) {
      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `images/${imageFile.originalname}`,
        Body: imageFile.buffer,
        ContentType: imageFile.mimetype,
        ACL: "public-read",
      };

      try {
        await s3.send(new PutObjectCommand(uploadParams));
        logger.info("Image uploaded successfully. S3 Object URL:");
      } catch (e) {
        logger.error("Error uploading image to S3:", e);
        throw new Error("Error uploading image to S3");
      }
    }
  } catch (e) {
    logger.error("Error uploading image to S3:", e);
    throw new Error("Error uploading image to S3");
  } finally {
    subsegment?.close();
  }
}
