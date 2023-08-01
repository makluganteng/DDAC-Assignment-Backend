import cors from "cors";
import { create } from "domain";
import express, { Router } from "express";
import { createGiftRouter } from "./Giftcard/createGift";

export const rootRouter = () => {
  const router = Router();
  router.use(express.json());
  router.use(cors());

  router.use("/gift", createGiftRouter());
  router.use("/subscription", createGiftRouter());

  return router;
};
