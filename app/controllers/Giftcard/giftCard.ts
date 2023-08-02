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

export class GiftController {
  constructor() {}
  uploadNewVoucher = async (req: Request, res: Response) => {
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

      let temp;

      //check if category exist
      const { rows } = await client.query({
        text: `SELECT * FROM category WHERE category_name = $1`,
        values: [category],
      });

      logger.info("Check Category:", rows);

      if (rows.length === 0 && file.length === 2) {
        const { rows: rows1 } = await client.query({
          text: `INSERT INTO category (category_name, category_image_url) VALUES ($1, $2) RETURNING *`,
          values: [
            category,
            `https://ddac-data.s3.amazonaws.com/images/${file[1].originalname}`,
          ],
        });

        logger.info("Check Category:", rows1);
        temp = rows1[0].id;
      } else {
        temp = rows[0].id;
      }

      // Insert the file data into S3 (you should implement the insertS3 function)
      await insertS3(file);

      //insert the file data into database;
      const { rows: rows2 } = await client.query({
        text: `INSERT INTO gift_cards (gift_card_name, gift_card_price, gift_card_image_url, category_id) VALUES ($1, $2, $3, $4) RETURNING *`,
        values: [
          voucherName,
          voucherPrice,
          `https://ddac-data.s3.amazonaws.com/images/${file[0].originalname}`,
          temp,
        ],
      });

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

      const brodcastSuccess = await publishMessage(input);

      logger.info("Broadcast Success:", brodcastSuccess);

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows2[0],
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
      client.release();
    }
  };

  deleteVoucher = async (req: Request, res: Response) => {
    const { client } = await createDbConnection();

    try {
      const { id } = req.params;
      logger.info(id);
      const { rows: rows1 } = await client.query({
        text: `SELECT * FROM gift_cards WHERE id = $1`,
        values: [id],
      });

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

      const brodcastSuccess = await publishMessage(input);

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
      client.release();
    }
  };

  updateVoucher = async (req: Request, res: Response) => {
    const { client } = await createDbConnection();

    try {
      const { id } = req.params;
      const { category, voucherName, voucherPrice } = req.body;

      const { rows: rows2 } = await client.query({
        text: `SELECT * FROM category WHERE category_name = $1`,
        values: [category],
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

      logger.info("Category:", rows2[0].id);

      const { rows } = await client.query({
        text: `UPDATE gift_cards SET gift_card_name = $1, gift_card_price = $2, category_id = $3 WHERE id = $4 RETURNING *`,
        values: [voucherName, voucherPrice, rows2[0].id, id],
      });

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

      const brodcastSuccess = await publishMessage(input);

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
      client.release();
    }
  };

  getAllVoucher = async (req: Request, res: Response) => {
    const { client } = await createDbConnection();

    try {
      const { rows } = await client.query({
        text: `SELECT gift_cards.id, gift_cards.gift_card_name, gift_cards.gift_card_price, gift_cards.gift_card_image_url, category.category_name FROM gift_cards INNER JOIN category ON gift_cards.category_id = category.id`,
      });

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
      client.release();
    }
  };

  //get voucher category
  getVoucherCategory = async (req: Request, res: Response) => {
    const { client } = await createDbConnection();
    try {
      const { rows } = await client.query({
        text: `SELECT * FROM category`,
      });

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
      client.release();
    }
  };

  //get voucher by category name
  getVoucherByCategoryName = async (req: Request, res: Response) => {
    const { client } = await createDbConnection();
    try {
      const { category } = req.params;
      const { rows } = await client.query({
        text: `SELECT gift_cards.id, gift_cards.gift_card_name, gift_cards.gift_card_price, gift_cards.gift_card_image_url, category.category_name FROM gift_cards INNER JOIN category ON gift_cards.category_id = category.id WHERE category.category_name = $1`,
        values: [category],
      });

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
      client.release();
    }
  };

  //get voucher by category
  getVoucherByCategory = async (req: Request, res: Response) => {
    const { client } = await createDbConnection();
    try {
      const { id } = req.params;
      const { rows } = await client.query({
        text: `SELECT gift_cards.id, gift_cards.gift_card_name, gift_cards.gift_card_price, gift_cards.gift_card_image_url, category.category_name FROM gift_cards INNER JOIN category ON gift_cards.category_id = category.id WHERE category.id = $1`,
        values: [id],
      });

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
      client.release();
    }
  };

  buyVoucher = async (req: Request, res: Response) => {
    const { client } = await createDbConnection();
    try {
      const { email, voucherName, voucherId } = req.body;
      const { rows } = await client.query({
        text: `SELECT * FROM gift_cards WHERE id = $1`,
        values: [voucherId],
      });

      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Voucher not found",
        });
      }

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
        text: `Vocuher ${voucherName} has been bought here is the code ${voucherCode}`,
      };

      const info = await transporter.sendMail(message);
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
      client.release();
    }
  };

  //fetch the newest one on 1 week ago
  getVoucherNewest = async (req: Request, res: Response) => {
    const { client } = await createDbConnection();
    try {
      logger.info("Fetching data...");
      const { rows } = await client.query({
        text: `SELECT *
        FROM category
        WHERE created_at >= NOW() - INTERVAL '1 week';
        `,
      });
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
      client.release();
    }
  };
}
