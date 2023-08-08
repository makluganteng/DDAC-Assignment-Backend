import { add } from "winston";
import { createSubscription } from "../../services/sns";
import { logger } from "../../services/logger";
import * as AWSXRay from "aws-xray-sdk";

export class SubscriptionController {
  constructor() {}

  addSubscription = async (req: any, res: any) => {
    const segment = AWSXRay.getSegment()?.addNewSubsegment("add-subscription");
    logger.info("Subscription Data is :", req.body);
    try {
      segment?.addAnnotation("email", req.body.email);
      logger.info("Checking email");
      if (!req.body.email) {
        return res.status(400).send({
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          status: "error",
          message: "No email provided",
        });
      }
      const input = {
        Protocol: "email",
        TopicArn: process.env.AWS_SNS_ARN,
        Endpoint: req.body.email,
      };
      const snsSegment = segment?.addNewSubsegment("sns-create-subscription");
      const add = await createSubscription(input);
      logger.info("Subscription Success:", add);
      snsSegment?.close();
      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: "Subscription added please confirm your email",
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
