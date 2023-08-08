import { Router } from "express";
import * as AWSXRay from "aws-xray-sdk";
import { CustomerController } from "../../controllers/Customer/customer";

export const customerRouter = () => {
  const router = Router();
  const customerController = new CustomerController();

  router.post("/register", customerController.addCustomer);

  router.post("/login", customerController.getCustomer);

  router.get("/getCustomer/:username", customerController.getCustomerByName);

  router.post("/updateCustomer", customerController.updateCustomer);

  return router;
};
