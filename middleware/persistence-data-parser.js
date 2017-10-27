
/**
 * Parsea datos de filtros, order y paging que se pueden encontrar en el request.
 * Los params correspondientes a filtros deben seguir el patron:
 * by_path_sequelizeCondition=value
 * Los params correspondientes a orders deben seguir el patron:
 * orderBy_path=ASC o orderBy_path=DESC
 * Los params de paginacion son page y pageSize
 */
const parse = async (ctx, next) => {
  const paramKeys = Object.keys(ctx.query);
  const filterRegex = new RegExp("by_.+");
  const orderRegex = new RegExp("orderBy_.+");
  const filters = [];
  const orders = [];

  for (let key of paramKeys) {

    if (filterRegex.test(key)) {
      filters.push(parseFilter(key, ctx.query[key]));
    }
    if (orderRegex.test(key)) {
      orders.push(parseOrder(key, ctx.query[key]));
    }
  }

  const pagingInfo = {};
  if (ctx.query.page) {
    pagingInfo.page = parseInt(ctx.query.page);
  }
  if (ctx.query.pageSize) {
    pagingInfo.pageSize = parseInt(ctx.query.pageSize);
  }

  ctx.query.filters = filters;
  ctx.query.orders = orders;
  ctx.query.paging = pagingInfo;
  console.log("Filters", filters);
  console.log("Orders", orders);
  console.log("Paging", pagingInfo);
  await next();
}

const parseFilter = (key, value) => {
  const filter = {};
  const splitted = key.split("_");
  const filterObject = {};
  filter[splitted[1]] = filterObject;
  if (splitted.length > 2) {
    filterObject[splitted[2]] = value;
  } else {
    //Si no hay una condicion especifica, usamos eq como default
    filterObject['$eq'] = value;
  }
  return filter;
}

const parseOrder = (key, value) => {
  const splitted = key.split("_");
  const path = splitted[1];
  if (value !== "asc" && value !== "desc") {
    throw Error("Los valores admitidos de ordenamiento son ASC y DESC");
  }
  return [path, value];
}

module.exports = parse;