import * as dbService from "../../DB/db.service.js";

export const paginate = async ({
  page,
  size,
  model,
  filter = {},
  select = "",
  populate = [],
}) => {
  page = page < 1 ? Number(process.env.PAGE) || 1 : Number(page);
  size = size < 1 ? Number(process.env.SIZE) || 10 : Number(size);

  const skip = (page - 1) * size;

  const count = await model.countDocuments(filter);

  const data = await dbService.find({
    model,
    filter,
    populate,
    select,
    skip,
    limit: size,
  });

  return { data, page, size, count };
};
