import * as dbService from "../../DB/db.service.js";

export const paginate = async ({
  page,
  size,
  model,
  filter = {},
  select = "",
  populate = [],
  sort = "",
}) => {
  page = page < 1 ? Number(process.env.PAGE) || 1 : Number(page);
  size = size < 1 ? Number(process.env.SIZE) || 8 : Number(size);

  const skip = (page - 1) * size;

  const count = await model.countDocuments(filter);

  const data = await dbService.findAll({
    model,
    filter,
    populate,
    select,
    skip,
    limit: size,
    sort,
  });

  return { data, page, size, count };
};
