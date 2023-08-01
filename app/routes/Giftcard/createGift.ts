import { Router } from "express";
import multer from "multer";
import { GiftController } from "../../controllers/Giftcard/giftCard";
export const createGiftRouter = () => {
  const router = Router();
  const createGiftController = new GiftController();

  const upload = multer({ dest: "files" });

  router.post(
    "/createGift",
    upload.any(),
    createGiftController.uploadNewVoucher
  );

  router.get("", createGiftController.getAllVoucher);

  router.post("/deleteVoucher/:id", createGiftController.deleteVoucher);

  router.post("/updateVoucher/:id", createGiftController.updateVoucher);

  return router;
};
