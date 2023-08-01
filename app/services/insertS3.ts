import { S3Client, PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import { logger } from "./logger";

export async function insertS3(image: Express.Multer.File[]) {
  const s3 = new S3({ region: "us-east-1" });
  const data = image;
  const buf = Buffer.from(JSON.stringify(data));
  try {
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `images/${image[0].originalname}`,
      Body: buf,
      ContentType: image[0].mimetype,
      ACL: "public-read",
    };
    const result = await s3.putObject(uploadParams);
    logger.info("Image uploaded successfully. S3 Object URL:");
    return result;
  } catch (e) {
    logger.error("Error uploading image to S3:", e);
    throw new Error("Error uploading image to S3");
  }
}
