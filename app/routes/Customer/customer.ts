import { Router } from "express";
import { CustomerController } from "../../controllers/Customer/customer";

export const customerRouter = () => {
  const router = Router();
  const customerController = new CustomerController();

  router.post("/register", customerController.addCustomer);

  router.post("/login", customerController.getCustomer);

  return router;
};
