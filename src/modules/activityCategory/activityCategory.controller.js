import { Router } from "express";
import * as categoryService from "./services/activityCategory.service.js";
import * as validators from "./activityCategory.validation.js";
import { validation } from "../../middleware/validation.middleware.js";
import { authentication, authorization } from "../../middleware/auth.middleware.js";
import { roleTypes } from "../../DB/Model/User.model.js";

const router = Router();

router.post(
  "/",
  authentication(),
  authorization([roleTypes.admin]),
  validation(validators.createCategory),
  categoryService.createCategory
);

router.get("/", categoryService.getAllCategories);

router.get("/:id", validation(validators.paramId), categoryService.getCategoryById);

router.patch(
  "/:id",
  authentication(),
  authorization([roleTypes.admin]),
  validation(validators.updateCategory),
  categoryService.updateCategory
);

router.delete(
  "/:id",
  authentication(),
  authorization([roleTypes.admin]),
  validation(validators.paramId),
  categoryService.deleteCategory
);

export default router;
