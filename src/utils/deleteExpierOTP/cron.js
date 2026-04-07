import cron from "node-cron";
import * as dbService from "../../DB/db.service.js";
import { userModel } from "../../DB/Model/User.model.js";
import { logger } from "../logger.js";

cron.schedule(
  "0 */6 * * *",
  async () => {
    try {
      const currentTime = new Date();
      await dbService.updateMany({
        model: userModel,
        filter: { "OTP.expiresIn": { $lt: currentTime } },
        update: { $pull: { OTP: { expiresIn: { $lt: currentTime } } } },
      });
    } catch (error) {
      logger.error("CRON JOB ERROR:", error);
    }
  },
  {
    scheduled: true,
    timezone: "UTC",
  }
);
