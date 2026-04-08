export const asyncHandler = (fun) => {
    return (req, res, next) => {
        fun(req, res, next).catch(error => {
            error.status = 500;
            return next(error)
        })
    }
}

export const globalErrorHandling = (error, req, res, next) => {
    const isProduction = process.env.NODE_ENV?.trim().toLowerCase() === "production";
    
    if (!isProduction) {
        console.error("DEBUG - Global Error Handler caught:", error);
        return res.status(error.cause || 400).json({ 
            message: error.message, 
            error, 
            stack: error.stack 
        });
    }
    
    return res.status(error.cause || 400).json({ 
        message: error.message, 
        error 
    });
}

export const createUnauthorizedError = (
  message = 'Unauthorized - Please login'
) => {
  return new ApiError(HTTP_STATUS.UNAUTHORIZED, message);
};
