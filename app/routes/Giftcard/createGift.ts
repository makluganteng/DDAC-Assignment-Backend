import { Router } from "express";
import multer from "multer";
import { GiftController } from "../../controllers/Giftcard/giftCard";
export const createGiftRouter = () => {
  const router = Router();
  const createGiftController = new GiftController();

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 1024 * 1024 * 10, // 10 MB (adjust the size limit as needed)
    },
  });

  router.post(
    "/createGift",
    upload.array("image", 2),
    createGiftController.uploadNewVoucher
  );

  router.post(
    "/createCategory",
    upload.array("image", 1),
    createGiftController.uploadCategory
  );

  router.get("", createGiftController.getAllVoucher);

  router.post("/deleteVoucher/:id", createGiftController.deleteVoucher);

  router.post(
    "/updateVoucher/:id",
    upload.any(),
    createGiftController.updateVoucher
  );

  router.post("/buyVoucher", createGiftController.buyVoucher);

  router.get("/getCategory", createGiftController.getVoucherCategory);

  router.get("/getVoucher/:id", createGiftController.getVoucherByCategory);

  router.get(
    "/getCategoryByName/:category",
    createGiftController.getVoucherByCategoryName
  );

  router.get("/getVoucherNewest", createGiftController.getVoucherNewest);

  router.post("/deleteCategory/:id", createGiftController.deleteCategory);

  return router;
};
