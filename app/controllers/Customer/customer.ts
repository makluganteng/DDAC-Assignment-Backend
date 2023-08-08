import { Request, Response } from "express";
import { createDbConnection } from "../../services/db";
import { generateToken } from "../../services/jwt";
import { logger } from "../../services/logger";
import * as AWSXRay from "aws-xray-sdk";

export class CustomerController {
  constructor() {}

  //add customer to the database (Register)
  addCustomer = async (req: any, res: any) => {
    const segment = AWSXRay.getSegment()?.addNewSubsegment("add-customer");
    const { client } = await createDbConnection();
    try {
      logger.info("Customer Data is :", req.body);
      const { email, username, password } = req.body;
      segment?.addAnnotation("username", username);
      segment?.addAnnotation("password", password);
      segment?.addAnnotation("email", email);

      const dbSegment = segment?.addNewSubsegment("db-query");
      const { rows } = await client.query({
        text: `INSERT INTO customer (email, username, password) VALUES ($1, $2, $3) RETURNING *`,
        values: [email, username, password],
      });
      dbSegment?.close();

      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Customer not added",
        });
      }

      const token = generateToken(username);

      logger.info("Customer Data is :", rows);
      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows[0],
        token: token,
      });
    } catch (e) {
      logger.info("Error is :", e);
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

  //get customer from the database (Login)
  getCustomer = async (req: any, res: any) => {
    const segment = AWSXRay.getSegment()?.addNewSubsegment("get-customer");
    const { client } = await createDbConnection();
    try {
      const { username, password } = req.body;
      segment?.addAnnotation("username", username);
      segment?.addAnnotation("password", password);

      const dbSegment = segment?.addNewSubsegment("db-query");
      const { rows } = await client.query({
        text: `SELECT * FROM customer WHERE username = $1 AND password = $2`,
        values: [username, password],
      });
      dbSegment?.close();

      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Customer not found",
        });
      }

      logger.info("Customer Data is :", rows);

      const token = generateToken(username);

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows[0],
        token: token,
      });
    } catch (e) {
      logger.info("Error is :", e);
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

  getCustomerByName = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment()?.addNewSubsegment("get-customer");
    const { client } = await createDbConnection();
    try {
      const { username } = req.params;
      segment?.addAnnotation("username", username);

      const dbSegment = segment?.addNewSubsegment("db-query");
      const { rows } = await client.query({
        text: `SELECT * FROM customer WHERE username = $1`,
        values: [username],
      });
      dbSegment?.close();

      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Customer not found",
        });
      }

      logger.info("Customer Data is :", rows);

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows[0],
      });
    } catch (e) {
      logger.info("Error is :", e);
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

  updateCustomer = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment();
    const { client } = await createDbConnection();
    try {
      const { email, password, username } = req.body;
      segment?.addAnnotation("username", username);
      segment?.addAnnotation("email", email);
      segment?.addAnnotation("password", password);

      const dbSegment = segment?.addNewSubsegment("db-query");
      const { rows } = await client.query({
        text: `UPDATE customer SET email = $1, password = $2 WHERE username = $3 RETURNING *`,
        values: [email, password, username],
      });
      dbSegment?.close();

      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Customer not updated",
        });
      }

      logger.info("Customer Data is :", rows);

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: rows[0],
      });
    } catch (e) {
      logger.info("Error is :", e);
      return res.status(500).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "error",
        message: "Internal server error",
      });
    } finally {
      client.release();
      segment?.close();
    }
  };
}
