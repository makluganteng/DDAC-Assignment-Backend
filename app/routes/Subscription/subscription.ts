import { Router } from "express";
import { SubscriptionController } from "../../controllers/Subscription/subscription";

export const subscriptionRouter = () => {
  const router = Router();
  const subscriptionController = new SubscriptionController();

  router.post("/addSubscription", subscriptionController.addSubscription);
};
