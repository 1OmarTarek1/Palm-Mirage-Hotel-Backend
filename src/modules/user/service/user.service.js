import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { userModel } from "../../../DB/Model/User.model.js";
import { successResponse } from "../../../utils/response/success.response.js";
// import { compareHash } from "../../../utils/security/hash.security.js";

//profile
export const userData = asyncHandler(async (req, res, next) => {
  const user = await dbService.findOne({
    model: userModel,
    filter: { _id: req.user._id },
  });
  return successResponse({ res, data: { user } });
});

//delete account
export const deleteAccount = asyncHandler(
    async (req, res, next) => {
        const user = await dbService.findOneAndUpdate({
            model: userModel,
            filter: {
                _id: req.user._id,
                deletedAt: null
            },
            options: { new: true },
            data: { deletedAt: Date.now() },
        })
        return successResponse({ res, message: "Account Freeze successfully" })
    }
)


// export const banUserfromAdmin = asyncHandler(async (req, res, next) => {
//     const { userid } = req.params;
//     const data = await dbService.findOneAndUpdate({ model: userModel, filter: { _id: userid }, data: { bannedAt: Date.now() }, options: { new: true } })
//     return successResponse({ res, message: "done" })

// })

// export const unbanUserfromAdmin = asyncHandler(async (req, res, next) => {
//     const { userId } = req.params;
//     const data = await dbService.findOneAndUpdate({ model: userModel, filter: { _id: userId }, data: { $unset: { bannedAt: 0 } }, options: { new: true } })
//     return successResponse({ res, message: "done" })

// })
