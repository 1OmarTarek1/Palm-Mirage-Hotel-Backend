import { Router } from 'express';
import * as registrationService from './services/registration.service.js'
import * as loginService from './services/login.service.js'
import * as changePasswordService from './services/changePassword.service.js'
import * as validators from './auth.validation.js'
import { validation } from '../../middleware/validation.middleware.js';
import { authentication } from '../../middleware/auth.middleware.js';

const router = Router()

router.post("/signup", validation(validators.signup), registrationService.signup)
router.patch("/confirm-email", validation(validators.confirmEmail), registrationService.confirmEmail)
router.post("/login", validation(validators.login), loginService.login)
router.post("/login-google", validation(validators.loginWithGoogle), loginService.loginWithGmail)

router.get("/me", authentication(), loginService.getMe)
router.get("/profile", authentication(), loginService.getMe)

router.get("/refresh-token", loginService.refreshToken)
router.post("/logout", loginService.logout)
 router.patch("/forgot-password", validation(validators.forgetPassword), loginService.forgotPassword)

router.patch("/reset-password", validation(validators.resetPassword), loginService.resetPassword)

router.patch(
  "/change-password",
  authentication(),
  validation(validators.changePassword),
  changePasswordService.changePassword
)



//authRouter.get('/reset-password/:token', AuthController.resetPassword);

export default router;
