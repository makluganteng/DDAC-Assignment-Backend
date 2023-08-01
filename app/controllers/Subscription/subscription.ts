import { add } from "winston";
import { createSubscription } from "../../services/sns";
import { logger } from "../../services/logger";

export class SubscriptionController {
  constructor() {}

  addSubscription = async (req: any, res: any) => {
    try {
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
      const add = await createSubscription(input);

      logger.info("Subscription Success:", add);

      return res.status(200).send({
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        status: "success",
        message: "Subscription added please confirm your email",
      });
    } catch (e) {
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
