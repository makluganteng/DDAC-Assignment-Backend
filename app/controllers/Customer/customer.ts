import { createDbConnection } from "../../services/db";
import { logger } from "../../services/logger";

export class CustomerController {
  constructor() {}

  //add customer to the database (Register)
  addCustomer = async (req: any, res: any) => {
    const { client } = await createDbConnection();
    try {
      logger.info("Customer Data is :", req.body);
      const { email, name, password } = req.body;
      const { rows } = await client.query({
        text: `INSERT INTO customer (email, name, password) VALUES ($1, $2, $3) RETURNING *`,
        values: [email, name, password],
      });
      if (rows.length === 0) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Customer not added",
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
    }
  };

  //get customer from the database (Login)
  getCustomer = async (req: any, res: any) => {
    const { client } = await createDbConnection();
    try {
      const { email, password } = req.body;
      const { rows } = await client.query({
        text: `SELECT * FROM customer WHERE email = $1 AND password = $2`,
        values: [email, password],
      });
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
      client.release();
    }
  };
}
