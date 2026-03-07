import cron from "node-cron";
import * as dbService from "../../DB/db.service.js";
import { userModel } from "../../DB/Model/User.model.js";

cron.schedule(
  "0 */6 * * *",
  async () => {
    try {
      console.log(" CRON JOB STARTED: Checking and deleting expired OTPs...");

      const currentTime = new Date();
      const result = await dbService.updateMany({
        model: userModel,
        filter: { "OTP.expiresIn": { $lt: currentTime } },
        update: { $pull: { OTP: { expiresIn: { $lt: currentTime } } } },
      });

      console.log(` Expired OTPs deleted: ${result.modifiedCount} users affected.`);
    } catch (error) {
      console.error(" CRON JOB ERROR:", error);
    }
  },
  {
    scheduled: true,
    timezone: "UTC",
  }
);
