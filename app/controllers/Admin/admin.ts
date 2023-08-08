import { Request, Response } from "express";
import { generateToken } from "../../services/jwt";
import { logger } from "../../services/logger";
import * as AWSXRay from "aws-xray-sdk";

export class AdminController {
  constructor() {}
  loginAdmin = async (req: Request, res: Response) => {
    const segment = AWSXRay.getSegment()?.addNewSubsegment("login-admin");
    try {
      const { username, password } = req.body;
      segment?.addAnnotation("username", username);
      segment?.addAnnotation("password", password);
      if (username !== "admin" && password !== "admin") {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "Admin not found",
        });
      }

      const tokenSegment = segment?.addNewSubsegment("generate-token");
      const token = generateToken(username);
      tokenSegment?.close();

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
    } finally {
      segment?.close();
    }
  };
}
