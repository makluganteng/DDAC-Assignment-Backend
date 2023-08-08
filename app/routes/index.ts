import cors from "cors";
import { create } from "domain";
import express, { Router } from "express";
import { createGiftRouter } from "./Giftcard/createGift";
import { customerRouter } from "./Customer/customer";
import { subscriptionRouter } from "./Subscription/subscription";
import { adminRouter } from "./Admin/admin";
import * as AWSXRay from "aws-xray-sdk";

export const rootRouter = () => {
  const router = Router();
  router.use(express.json());
  router.use(cors());

  router.use("/gift", createGiftRouter());
  router.use("/subscription", subscriptionRouter());
  router.use("/customer", customerRouter());
  router.use("/admin", adminRouter());

  return router;
};
