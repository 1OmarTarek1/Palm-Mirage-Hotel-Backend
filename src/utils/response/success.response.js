
export const successResponse = ({ res, message = "Done", status = 200, data = {} }) => {
    const normalizedData = Array.isArray(data)
        ? data
        : data && typeof data === "object"
            ? { ...data }
            : data;

    return res.status(status).json({ message, data: normalizedData })
}
