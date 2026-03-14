// import { asyncHandler  } from "../../../utils/response/error.response.js"
// import { successResponse } from "../../../utils/response/success.response.js"
// import { User } from "../../../DB/Model/User.model.js"
// import { generateResetToken, encrypt, decodeToken, hashPassword } from "../../../utils/security/token.security.js"
// import { sendPasswordResetEmail } from "../../../utils/event/email.event.js"
// import { createUnauthorizedError } from "//../../../utils/response/error.response.js"
// export const forgotPassword = asyncHandler(async (req, res) => {
//   const { email } = req.body;

//   const user = await User.findOne({ email });

//   if (!user) {
//     return res.json(
//       successResponse(
//         { message: 'if there is an email you will had message' },
//         'Password reset email sent if email exists'
//       )
//     );
//   }

//   const resetToken = generateResetToken({ userId: user._id });

//   user.resetPasswordToken = encrypt(resetToken);

//   user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 60 * 1000);

//   await user.save();

//   try {
//     await sendPasswordResetEmail(user, resetToken);
//   } catch (error) {
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpires = undefined;
//     await user.save();
//     throw error;
//   }

//   res.json(
//     successResponse(
//       { message: 'password reset link sent to email' },
//       'Password reset email sent'
//     )
//   );
// });
// //reset
// export const resetPassword = asyncHandler(async (req, res) => {
//   const { token } = req.params;
//   const { password } = req.body;

//   const decoded = decodeToken(token);

//   if (!decoded || !decoded.userId) {
//     throw createUnauthorizedError('invalid or expired reset token');
//   }

//   const user = await User.findById(decoded.userId);

//   if (
//     !user ||
//     !user.resetPasswordToken ||
//     user.resetPasswordExpires < new Date()
//   ) {
//     throw createUnauthorizedError('invalid or expired reset token');
//   }

//   const hashpassword = await hashPassword(password);

//   user.password = hashpassword;
//   user.resetPasswordToken = undefined;
//   user.resetPasswordExpires = undefined;
//   user.refreshToken = [];

//   await user.save();

//   res.json(successResponse(user, 'Password reset successfully'));
// });