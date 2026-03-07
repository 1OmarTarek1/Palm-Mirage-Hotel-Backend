import { nanoid, customAlphabet } from "nanoid";
import { EventEmitter } from "node:events";
import { generateHash } from "../security/hash.security.js";
import { sendEmail } from "../email/send.email.js";
import { verficatioinEmailTemplate } from "../email/template/verfication.email.js";
import * as dbService from "../../DB/db.service.js";
import { otpTypes, userModel } from "../../DB/Model/User.model.js";

export const emailEvent = new EventEmitter({});

emailEvent.on("sendConfirmEmail", async (data) => {
  const { email } = data;
  //create OTP
  const emailotp = customAlphabet("0123456789", 4)();
  //hash OTP
  const hashOTP = generateHash({ plainText: `${emailotp}` });
  const OTP = {
    code: hashOTP,
    type: otpTypes.confirmEmail,
    expiresIn: new Date(Date.now() + 10 * 60 * 1000),
  };
  const html = verficatioinEmailTemplate({ code: emailotp });
  await dbService.updateOne({
    model: userModel,
    filter: { email },
    data: { $push: { OTP } },
    options: { new: true },
  });
  await sendEmail({ to: email, subject: "Confirm-Email", html });
  console.log("email sent");
});

emailEvent.on("sendForgetPaasword", async (data) => {});
