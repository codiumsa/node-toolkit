
/**
 * Parsea datos de filtros, order y paging que se pueden encontrar en el request.
 * Los params correspondientes a filtros deben seguir el patron:
 * by_path-sequelizeCondition=value
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
  //ctx.query.pageAll evita que se limite el listado
  if(!ctx.query.pageAll) {
    ctx.query.paging = pagingInfo;
  }
  console.log("Filters", filters);
  console.log("Orders", orders);
  console.log("Paging", pagingInfo);
  await next();
}

const parseFilter = (key, value) => {
    const filter = {};
    const filterObject = {};
    var filterParsedObject = parseFilterMethod(key);
    if(filterParsedObject.hasOwnProperty("condition")) {
        filterObject[filterParsedObject["condition"]] = filterParsedObject["condition"] === '$like' ? `%${value}%` : value;
    } else {
        //Si no hay una condicion especifica, usamos eq como default
        filterObject['$eq'] = value;
    }

    filter[filterParsedObject["field"]] = filterObject;
    return filter;
}

function parseFilterMethod(filterString) {
	var filter = {};
	//separamos el by_ del resto
	if(filterString.split("_").length > 0) {
		var auxFields = filterString.substring(filterString.indexOf("_") + 1);
		if(auxFields.indexOf("-") == -1) {
			filter["field"] = auxFields;
		} else {
			var arrayParse = auxFields.split("-");
			filter["field"] = arrayParse[0];
			filter["condition"] = arrayParse[1];
		}
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