

// Create

export const create = async ({ model, data = {} } = {}) => {
    const decument = await model.create(data);
    return decument
}

////find
export const findAll = async ({ model, filter = {}, select = "", populate = [], skip = 0, limit = 1000 } = {}) => {
    const decuments = await model.find(filter).select(select).populate(populate).skip(skip).limit(limit);
    return decuments
}
export const findOne = async ({ model, filter = {}, select = "", populate = [] } = {}) => {
    const decument = await model.findOne(filter).select(select).populate(populate);
    return decument
}

// Update
export const findOneAndUpdate = async ({ model, filter = {}, data = {}, options = {}, select = "", populate = [] } = {}) => {
    const decument = await model.findOneAndUpdate(filter, data, options).select(select).populate(populate);
    return decument
}
export const findByIdAndUpdate = async ({ model, id = {}, data = {}, options = {}, select = "", populate = [] } = {}) => {
    const decument = await model.findByIdAndUpdate(id, data, options).select(select).populate(populate);
    return decument
}
export const updateOne = async ({ model, filter = {}, data = {}, options = {} } = {}) => {
    const decument = await model.updateOne(filter, data, options);
    return decument
}
export const updateMany = async ({ model, filter = {}, data = {}, options = {} } = {}) => {
    const decuments = await model.updateMany(filter, data, options);
    return decuments
}

// Delete
export const findOneAndDelete = async ({ model, filter = {}, options = {}, select = "", populate = [] } = {}) => {
    const decument = await model.findOneAndDelete(filter, options).select(select).populate(populate);
    return decument
}
export const findByIdAndDelete = async ({ model, id = {}, select = "", populate = [] } = {}) => {
    const decument = await model.findByIdAndDelete(id).select(select).populate(populate);
    return decument
}
export const deleteOne = async ({ model, filter = {} } = {}) => {
    const decument = await model.deleteOne(filter);
    return decument
}
export const deleteMany = async ({ model, filter = {} } = {}) => {
    const decuments = await model.deleteMany(filter);
    return decuments
}