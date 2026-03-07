import { Router } from 'express';
import * as registrationService from './services/registration.service.js'
import * as loginService from './services/login.service.js'
import * as validators from './auth.validation.js'
import { validation } from '../../middleware/validation.middleware.js';
const router = Router()

router.post("/signup", validation(validators.signup), registrationService.signup)
router.patch("/confirm-email", validation(validators.confirmEmail), registrationService.confirmEmail)
router.post("/login", validation(validators.login), loginService.login)
// router.post('/loginWithGmail', loginService.loginWithGmail)

router.get("/refresh-token", loginService.refreshToken)
// router.patch("/forget-password", validation(validators.forgetPassword), loginService.forgetPassword)
// router.patch("/reset-password", validation(validators.resetPassword), loginService.resetPassword)


export default router;