import * as dbService from "../../DB/db.service.js";

export const paginate = async ({
  page,
  size,
  limit,
  perPage,
  offset,
  model,
  filter = {},
  select = "",
  populate = [],
  sort = "",
}) => {
  const defaultPage = Number(process.env.PAGE) || 1;
  const defaultSize = Number(process.env.SIZE) || 8;
  const resolvedSize = Number(size ?? limit ?? perPage);
  const resolvedPage = Number(page);
  const resolvedOffset = Number(offset);

  size =
    Number.isFinite(resolvedSize) && resolvedSize > 0
      ? resolvedSize
      : defaultSize;

  if (Number.isFinite(resolvedPage) && resolvedPage > 0) {
    page = resolvedPage;
  } else if (Number.isFinite(resolvedOffset) && resolvedOffset >= 0) {
    page = Math.floor(resolvedOffset / size) + 1;
  } else {
    page = defaultPage;
  }

  const skip = (page - 1) * size;

  const count = await model.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(count / size));

  const data = await dbService.findAll({
    model,
    filter,
    populate,
    select,
    skip,
    limit: size,
    sort,
  });

  return {
    data,
    page,
    size,
    limit: size,
    count,
    total: count,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
