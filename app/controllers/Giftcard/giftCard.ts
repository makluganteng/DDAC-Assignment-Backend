import { Request, Response } from "express";
import { logger } from "../../services/logger";
import { insertS3 } from "../../services/insertS3";
import { createDbConnection } from "../../services/db";
import { createSubscription, publishMessage } from "../../services/sns";
import {
  PublishCommandInput,
  SubscribeCommandInput,
} from "@aws-sdk/client-sns";
import nodemailer from "nodemailer";
import { generateVoucherCode } from "../../services/codeGen";
import { log } from "console";
import * as AWSXRay from "aws-xray-sdk";

export class GiftController {
  constructor() {}

  uploadNewVoucher = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment();
    if (!segment) {
      logger.error("Segment is not available");
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Segement is not available",
      });
    }
    const uploadSegment = segment.addNewSubsegment("Upload Voucher");
    const { client } = await createDbConnection();
    try {
      logger.info("is the parent traced ? : ==========", segment?.notTraced);

      // try {
      logger.info("Uploaded image:", req.body);
      logger.info("============================");
      const file = req.files as Express.Multer.File[];

      if (!file) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "No file uploaded",
        });
      }

      const { category, voucherName, voucherPrice } = req.body;

      if (uploadSegment) {
        uploadSegment.addMetadata("voucherName", voucherName);
        uploadSegment.addMetadata("voucherPrice", voucherPrice);
        uploadSegment.addMetadata("fileCount", file.length);
      }

      let temp;

      const dbCheckSegment =
        uploadSegment.addNewSubsegment("DB Check Category");

      //check if category exist
      const { rows } = await client.query({
        text: `SELECT * FROM category WHERE category_name = $1`,
        values: [category],
      });

      dbCheckSegment.close();

      logger.info("Check Category:", rows);

      if (rows.length === 0 && file.length === 2) {
        const { rows: rows1 } = await client.query({
          text: `INSERT INTO category (category_name, category_image_url) VALUES ($1, $2) RETURNING *`,
          values: [
            category,
            `https://d1yeknl0fz3e4e.cloudfront.net/images/${file[1].originalname}`,
          ],
        });

        logger.info("Check Category:", rows1);
        temp = rows1[0].id;
      } else {
        temp = rows[0].id;
      }

      const s3Segment = uploadSegment.addNewSubsegment("Upload to S3");
      // Insert the file data into S3 (you should implement the insertS3 function)
      await insertS3(file);

      s3Segment.close();

      const dbInsertSegment =
        uploadSegment.addNewSubsegment("DB Insert GiftCard");
      //insert the file data into database;
      const { rows: rows2 } = await client.query({
        text: `INSERT INTO gift_cards (gift_card_name, gift_card_price, gift_card_image_url, category_id) VALUES ($1, $2, $3, $4) RETURNING *`,
        values: [
          voucherName,
          voucherPrice,
          `https://d1yeknl0fz3e4e.cloudfront.net/images/${file[0].originalname}`,
          temp,
        ],
      });

      dbInsertSegment.close();

      if (rows2.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Error inserting data",
        });
      }

      const input: PublishCommandInput = {
        Message: `A new voucher has been added to this ${category} category, check it now before it is sold out :3`,
        TopicArn: process.env.AWS_SNS_ARN,
      };

      const snsSegment = uploadSegment.addNewSubsegment("SNS Broadcast");

      const brodcastSuccess = await publishMessage(input);

      snsSegment.close();

      logger.info("Broadcast Success:", brodcastSuccess);

      if (uploadSegment.notTraced === true) {
        return res.status(500).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Not Traced",
        });
      }

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows2[0],
        broadcasted: segment,
      });
    } catch (e) {
      logger.error("Error uploading image:", e);
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      // Close the database connection
      uploadSegment.close();
      client.release();
    }
  };

  uploadCategory = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment();
    if (!segment) {
      logger.error("Segment is not available");
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Segement is not available",
      });
    }
    const uploadSegment = segment.addNewSubsegment("Upload Category");
    const { client } = await createDbConnection();
    try {
      logger.info("Uploaded image:", req.body);
      logger.info("============================");
      const file = req.files as Express.Multer.File[];

      if (!file) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "No file uploaded",
        });
      }

      const { category, voucherName, voucherPrice } = req.body;

      uploadSegment.addAnnotation("voucherName", voucherName);
      uploadSegment.addMetadata("voucherPrice", voucherPrice);
      uploadSegment.addMetadata("fileCount", file.length);

      let temp;

      const dbSegment = uploadSegment.addNewSubsegment(
        "Database Query to check category"
      );

      //check if category exist
      const { rows } = await client.query({
        text: `SELECT * FROM category WHERE category_name = $1`,
        values: [category],
      });

      dbSegment.close();

      logger.info("Check Category:", rows);

      if (rows.length === 0 && file.length === 1) {
        const { rows: rows1 } = await client.query({
          text: `INSERT INTO category (category_name, category_image_url) VALUES ($1, $2) RETURNING *`,
          values: [
            category,
            `https://d1yeknl0fz3e4e.cloudfront.net/images/${file[0].originalname}`,
          ],
        });

        logger.info("Check Category:", rows1);
        temp = rows1[0].id;
      } else {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Category already exist",
        });
      }

      const s3Segment = uploadSegment.addNewSubsegment("Upload to S3");

      // Insert the file data into S3 (you should implement the insertS3 function)
      await insertS3(file);

      s3Segment.close();

      const input: PublishCommandInput = {
        Message: `A new category has been added, check it now before it is sold out :3`,
        TopicArn: process.env.AWS_SNS_ARN,
      };

      const snsSegment = uploadSegment.addNewSubsegment("SNS Broadcast");

      const brodcastSuccess = await publishMessage(input);

      snsSegment.close();

      logger.info("Broadcast Success:", brodcastSuccess);

      uploadSegment.addMetadata("responseStatusCode", res.statusCode);

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: "Category added successfully",
        broadcasted: brodcastSuccess,
      });
    } catch (e) {
      logger.error("Error uploading image:", e);
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      // Close the database connection
      uploadSegment.close();
      client.release();
    }
  };

  deleteVoucher = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment();
    if (!segment) {
      logger.error("Segment is not available");
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Segement is not available",
      });
    }
    const deleteSegment = segment.addNewSubsegment("deleteVoucher");
    const { client } = await createDbConnection();

    try {
      const { id } = req.params;
      deleteSegment.addAnnotation("voucherId", id);
      logger.info(id);

      const query1Segment = deleteSegment.addNewSubsegment("DatabaseQuery1");
      const { rows: rows1 } = await client.query({
        text: `SELECT * FROM gift_cards WHERE id = $1`,
        values: [id],
      });
      query1Segment.close();

      if (rows1.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Gift card not found",
        });
      }

      const { rows: rows2 } = await client.query({
        text: `SELECT * FROM category WHERE id = $1`,
        values: [rows1[0].category_id],
      });

      if (rows2.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Category not found",
        });
      }

      const { rows } = await client.query({
        text: `DELETE FROM gift_cards WHERE id = $1 RETURNING *`,
        values: [id],
      });

      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Error deleting data",
        });
      }

      const input: PublishCommandInput = {
        Message: `A new voucher has been deleted to this ${rows2[0].category_name} category. Since we no longer have partnership any more :)`,
        TopicArn: process.env.AWS_SNS_ARN,
      };

      const snsSegment = deleteSegment.addNewSubsegment("SNSPublish");
      const brodcastSuccess = await publishMessage(input);
      snsSegment.close();

      logger.info("Broadcast Success:", brodcastSuccess);

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows[0],
      });
    } catch (e) {
      logger.error("Error deleting image:", e);
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      // Close the database connection
      deleteSegment.close();
      client.release();
    }
  };

  updateVoucher = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment();
    const updateVoucher = segment?.addNewSubsegment("updateVoucher");
    const { client } = await createDbConnection();

    try {
      const { id } = req.params;
      updateVoucher?.addAnnotation("voucherId", id);
      const { category, voucherName, voucherPrice } = req.body;
      updateVoucher?.addAnnotation("category", category);
      updateVoucher?.addAnnotation("voucherName", voucherName);
      updateVoucher?.addAnnotation("voucherPrice", voucherPrice);

      const databaseSegment = updateVoucher?.addNewSubsegment(
        "Database Quest category"
      );
      const { rows: rows2 } = await client.query({
        text: `SELECT * FROM category WHERE category_name = $1`,
        values: [category],
      });

      databaseSegment?.close();

      if (rows2.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Category not found",
        });
      }

      logger.info("Category:", rows2[0].id);

      const databaseSegment2 = updateVoucher?.addNewSubsegment(
        "Database Query update voucher"
      );
      const { rows } = await client.query({
        text: `UPDATE gift_cards SET gift_card_name = $1, gift_card_price = $2, category_id = $3 WHERE id = $4 RETURNING *`,
        values: [voucherName, voucherPrice, rows2[0].id, id],
      });

      databaseSegment2?.close();

      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Error updating data",
        });
      }

      const input: PublishCommandInput = {
        Message: `A voucher had been updated ${rows[0].gift_card_name} at ${rows2[0].category_name}. Check it out now :3`,
        TopicArn: process.env.AWS_SNS_ARN,
      };

      const snsSegment = updateVoucher?.addNewSubsegment("SNSPublish");
      const brodcastSuccess = await publishMessage(input);
      snsSegment?.close();

      logger.info("Broadcast Success:", brodcastSuccess);

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows[0],
      });
    } catch (e) {
      logger.error("Error updating data:", e);
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      // Close the database connection
      updateVoucher?.close();
      client.release();
    }
  };

  getAllVoucher = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment();
    const allVoucher = segment?.addNewSubsegment("getAllVoucher");
    const { client } = await createDbConnection();

    try {
      const databaseQuery1 = allVoucher?.addNewSubsegment(
        "Database Query gift card"
      );
      const { rows } = await client.query({
        text: `SELECT gift_cards.id, gift_cards.gift_card_name, gift_cards.gift_card_price, gift_cards.gift_card_image_url, category.category_name FROM gift_cards INNER JOIN category ON gift_cards.category_id = category.id`,
      });

      databaseQuery1?.close();

      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Error retrieving data",
        });
      }

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows,
      });
    } catch (e) {
      logger.error("Error retrieving data:", e);
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      // Close the database connection
      allVoucher?.close();
      client.release();
    }
  };

  //get voucher category
  getVoucherCategory = async (req: Request, res: Response) => {
    // Open main segment
    const segment = AWSXRay.getSegment();
    const getVoucherCategory = segment?.addNewSubsegment("getVoucherCategory");
    const { client } = await createDbConnection();
    try {
      // Open a subsegment for the database query
      const dbSegment = getVoucherCategory?.addNewSubsegment(
        "Database Query category"
      );
      const { rows } = await client.query({ text: `SELECT * FROM category` });
      dbSegment?.close(); // Close the subsegment as the query is done

      if (rows.length === 0) {
        return res.status(400).send({
          headers: { "Access-Control-Allow-Origin": "*" },
          status: "error",
          message: "No categories found",
        });
      }

      return res.status(200).send({
        headers: { "Access-Control-Allow-Origin": "*" },
        status: "success",
        message: rows,
      });
    } catch (e) {
      logger.error("Error retrieving data:", e);
      return res.status(500).send({
        headers: { "Access-Control-Allow-Origin": "*" },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      // Always ensure resources are released and segments are closed in the finally block
      getVoucherCategory?.close();
      client?.release();
    }
  };

  //get voucher by category name
  getVoucherByCategoryName = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment();
    const getVoucher = segment?.addNewSubsegment("getVoucherByCategoryName");
    const { client } = await createDbConnection();
    try {
      const { category } = req.params;
      getVoucher?.addAnnotation("category", category);

      const databaseQuery1 = getVoucher?.addNewSubsegment(
        "Database Query category"
      );
      const { rows } = await client.query({
        text: `SELECT gift_cards.id, gift_cards.gift_card_name, gift_cards.gift_card_price, gift_cards.gift_card_image_url, category.category_name FROM gift_cards INNER JOIN category ON gift_cards.category_id = category.id WHERE category.category_name = $1`,
        values: [category],
      });

      databaseQuery1?.close();

      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Error retrieving data",
        });
      }

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows,
      });
    } catch (e) {
      logger.error("Error retrieving data:", e);
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      // Close the database connection
      getVoucher?.close();
      client.release();
    }
  };

  //get voucher by category
  getVoucherByCategory = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment()?.addNewSubsegment(
      "getVoucherByCategory"
    );
    const { client } = await createDbConnection();
    try {
      const { id } = req.params;
      segment?.addAnnotation("id", id);

      const databaseQuery1 = segment?.addNewSubsegment(
        "Database Query gift card"
      );
      const { rows } = await client.query({
        text: `SELECT gift_cards.id, gift_cards.gift_card_name, gift_cards.gift_card_price, gift_cards.gift_card_image_url, category.category_name FROM gift_cards INNER JOIN category ON gift_cards.category_id = category.id WHERE category.id = $1`,
        values: [id],
      });

      databaseQuery1?.close();

      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Error retrieving data",
        });
      }

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows,
      });
    } catch (e) {
      logger.error("Error retrieving data:", e);
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      // Close the database connection
      segment?.close();
      client.release();
    }
  };

  buyVoucher = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment()?.addNewSubsegment("buyVoucher");
    const { client } = await createDbConnection();
    try {
      const { email, voucherName, voucherId } = req.body;
      segment?.addAnnotation("email", email);
      segment?.addAnnotation("voucherName", voucherName);
      segment?.addAnnotation("voucherId", voucherId);

      const databaseQuery1 = segment?.addNewSubsegment(
        "Database Query gift card"
      );
      const { rows } = await client.query({
        text: `SELECT * FROM gift_cards WHERE id = $1`,
        values: [voucherId],
      });

      databaseQuery1?.close();

      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Voucher not found",
        });
      }

      const emailFunc = segment?.addNewSubsegment("Create email payload");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "zksyncwalletwallet@gmail.com",
          pass: "lutcazjevouzivbi",
        },
      });

      const voucherCode = generateVoucherCode(10);

      const message = {
        from: process.env.EMAIL ?? "zksyncwalletwallet@gmail.com",
        to: email,
        subject: "Voucher Bought :3",
        text: `Voucher ${voucherName} has been bought here is the code ${voucherCode}`,
      };

      emailFunc?.close();

      const sendEmail = segment?.addNewSubsegment("Send email");
      const info = await transporter.sendMail(message);
      sendEmail?.close();
      logger.info("Email sent:", info);
      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: "Email sent",
      });
    } catch (e) {
      logger.error("Error sending email:", e);
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      // Close the database connection
      segment?.close();
      client.release();
    }
  };

  //fetch the newest one on 1 week ago
  getVoucherNewest = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment()?.addNewSubsegment("getVoucherNewest");
    const { client } = await createDbConnection();
    try {
      logger.info("Fetching data...");
      const databaseQuery1 = segment?.addNewSubsegment("Database Query");
      const { rows } = await client.query({
        text: `SELECT *
        FROM category
        WHERE created_at >= NOW() - INTERVAL '1 week';
        `,
      });
      databaseQuery1?.close();
      logger.info("Data fetched:", rows);
      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Error retrieving data",
        });
      }
      logger.info("Data sent:", rows);
      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows,
      });
    } catch (e) {
      logger.error("Error retrieving data:", e);
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      segment?.close();
      client.release();
    }
  };

  deleteCategory = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment()?.addNewSubsegment("deleteCategory");
    const { client } = await createDbConnection();
    try {
      const { id } = req.params;
      segment?.addAnnotation("categoryId", id);
      logger.info(id);

      const databaseQuery1 = segment?.addNewSubsegment(
        "Database Query category"
      );
      const { rows } = await client.query({
        text: `DELETE FROM gift_cards WHERE category_id = $1`,
        values: [id],
      });
      databaseQuery1?.close();

      const databaseQuery2 = segment?.addNewSubsegment(
        "Database delete voucher base on category id success"
      );

      logger.info("Deleteing Category......");
      const { rows: rows1 } = await client.query({
        text: `DELETE FROM category WHERE id = $1 RETURNING *`,
        values: [id],
      });

      databaseQuery2?.close();

      logger.info("Category deleted:", rows1);

      const checkQuery2 = segment?.addNewSubsegment("Check if category exist");

      if (rows1.length === 0) {
        checkQuery2?.addError("Database delete category failed");
        checkQuery2?.close();
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Category not found",
        });
      }

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: "Category deleted",
      });
    } catch (e) {
      logger.error("Error deleting category:", e);
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      // Close the database connection
      segment?.close();
      client.release();
    }
  };
}
