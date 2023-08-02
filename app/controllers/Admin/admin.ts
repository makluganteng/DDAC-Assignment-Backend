import { Request, Response } from "express";
import { generateToken } from "../../services/jwt";
import { logger } from "../../services/logger";

export class AdminController {
  constructor() {}
  loginAdmin = async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (username !== "admin" && password !== "admin") {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Admin not found",
        });
      }

      const token = generateToken(username);

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: token,
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
    }
  };
}
