import { asyncHandler } from "../utils/response/error.response.js"
import { decodeToken } from "../utils/security/token.security.js"


export const authentication = () => {
    return asyncHandler(async (req, res, next) => {
        req.user = await decodeToken({ authorization: req.headers.authorization, next })
        return next()
    })
}



export const authorization = (accessRoles = []) => {
    return asyncHandler(async (req, res, next) => {
        if (!accessRoles.includes(req.user.role)) {
            return next(new Error("Not Authorization Account ", { cause: 403 }))
        }
        return next()
    })
}