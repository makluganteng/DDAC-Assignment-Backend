import { Router } from "express";
import { AdminController } from "../../controllers/Admin/admin";
import * as AWSXRay from "aws-xray-sdk";

export const adminRouter = () => {
  const router = Router();
  const adminController = new AdminController();

  router.post("/login", adminController.loginAdmin);

  return router;
};
