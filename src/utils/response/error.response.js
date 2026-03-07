

export const asyncHandler = (fun) => {
    return (req, res, next) => {
        fun(req, res, next).catch(error => {
            error.status = 500;
            return next(error)
        })
    }
}



export const globalErrorHandling = (error, req, res, next) => {
    if (process.env.MOOD === "DEV") {
        return res.status(error.cause || 400).json({ message: error.message, error, stack: error.stack })
    }
    return res.status(error.cause || 400).json({ message: error.message, error })

}