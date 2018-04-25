const { Sequelize } = require('../../db').sequelize;

/**
 * Construye los settings de sequelize para filtros, ordenamiento y filtro general pasados
 * como parametro. Se encarga de inicializar las estructuras where, include y order necesarios
 * en el settings de sequelize.
 * @param settings los settings de sequelize a ser inicializados.
 * @param baseModel el model base sobre el cual estamos trabajando.
 * @param filter los filtros a agregar.
 * @param orders los ordenamientos a aplicarse
 * @param paging informacion de paginado
 * @param generalFilterValue valor para el filtro general.
 * @param fieldsInGeneralFilter los campos a usarse para el filtro general. Se inicializara
 * por default a los atributos del baseModel, exceptuando el id y los atributos de
 * created_at y updated_at.
 */
const constructSettings = (exports.constructSettings = (
  settings = {},
  baseModel,
  filters,
  orders,
  paging,
  generalFilterValue,
  fieldsInGeneralFilter
) => {
  if (!orders || orders.length === 0) {
    orders = [['id', 'ASC']];
  }
  //Procesamos el filtro general.
  if (generalFilterValue) {
    constructGeneralFilter(
      settings,
      baseModel,
      generalFilterValue,
      fieldsInGeneralFilter
    );
  }
  //Procesamos los filtros especificos
  if (filters) {
    addFiltersToSettings(settings, baseModel, filters);
  }
  //Agregamos los orders
  if (orders) {
    addOrderToSettings(settings, baseModel, orders);
  }
  //Agregamos informacion de paginacion
  if (paging) {
    addPagingToSettings(settings, baseModel, paging);
  }
  settings.subQuery = false;
  return settings;
});

/**
 * Construye el path teniendo en cuenta los atributos aliased. Por ejemplo, si le pasamos
 * roles.nombreRol, pero el atributo nombreRol en realidad esta aliased en la base de datos
 * bajo el underscore nombre_rol, se encarga de retornar roles.nombre_rol. Opera recursivamente
 * sobre todos los elementos del path pasado como argumento
 * @param path el path a procesar.
 * @param baseModel el model base.
 */
const getAliasedPath = (exports.getAliasedPath = (path, baseModel) => {
  const splitted = path.split('.');
  let subPath = splitted[0];
  //Solo verificamos en caso de ser un atributo. Si es una asociacion,
  //no hay nada que hacer, ya que recibimos el alias adecuado.
  //console.log('Los attributes son', baseModel.attributes);
  if (baseModel.attributes[subPath]) {
    const attr = baseModel.attributes[subPath];
    if (attr.field) {
      subPath = attr.field;
    }
  }
  if (baseModel.associations[subPath]) {
    baseModel = baseModel.associations[subPath].target;
  }
  if (splitted.length > 1) {
    splitted.shift();
    subPath = `${subPath}.${getAliasedPath(splitted.join('.'), baseModel)}`;
  }
  return subPath;
});
/**
 * Agrega un nuevo path a los settings de sequelize recibido como parametro.
 * @param el path a ser agregado.
 * @param settings es el settings para sequelize.
 * @param baseModel el model sequelize base.
 * @param required en caso de ser necesario hacer nuevos joins para el path, seran required.
 */
const addPathToSettings = (exports.addPathToSettings = (
  path,
  settings,
  baseModel,
  required = false
) => {
  const splitted = path.split('.');
  //Si el path no es compuesto, simplemente retornamos
  if (splitted.length == 1) {
    return;
  }
  const subPath = splitted[0];
  //Si no existia include en el settings, agregamos un array vacio
  if (!settings.include) {
    settings.include = [];
  }
  const targetModel = baseModel.associations[subPath].target;
  //Obtenemos el subsetting del setting actual filtrando en el include
  let subsetting = settings.include.filter(x => x.as === subPath)[0];
  //Si no se encuentra el subsetting, entonces creamos un nuevo subsetting
  //para el path que representa la asociacion
  if (!subsetting) {
    subsetting = {
      model: targetModel,
      as: subPath,
      attributes: [],
      required
    };
    settings.include.push(subsetting);
  }

  //Volvemos a construir el path sin el primer elemento
  splitted.shift();
  path = splitted.join('.');

  //Volvemos a procesar de forma recursiva
  addPathToSettings(path, subsetting, targetModel, required);
});

/**
 * Contruye el filtro general para un valor determinado.
 * Normalmente, value deberia ser una cadena.
 * @param settings los settings de sequelize que se estan construyendo.
 * @param baseModel model base para el cual se construiran los filtros.
 * @param value el valor con el que sera comparado.
 * @param pathsToCompare array de paths con los cuales se quiere comparar el
 * valor. De no ser proveido, se construye de forma default
 */
const constructGeneralFilter = (exports.constructGeneralFilter = (
  settings,
  baseModel,
  value,
  pathsToCompare
) => {
  if (!value) {
    return;
  }
  const pathsExcluded = ['created_at', 'updated_at', 'id'];
  if (!pathsToCompare) {
    //Incluimos los paths del model que no se encuentran en el array de paths excluidos
    pathsToCompare = Object.keys(baseModel.rawAttributes).filter(
      x => pathsExcluded.indexOf(x) < 0
    );
  }
  //Si no tenemos nada con que comparar, retornamos
  if (pathsToCompare.length === 0) {
    return;
  }

  const or = [];
  for (let path of pathsToCompare) {
    //Agregamos el path al settings por si sea compuesto
    addPathToSettings(path, settings, baseModel);
    if (path.split('.').length === 1) {
      path = `${baseModel.name}.${path}`;
    }
    const condition = Sequelize.where(
      Sequelize.cast(Sequelize.col(getAliasedPath(path, baseModel)), 'VARCHAR'),
      { $iLike: `%${value}%` }
    );
    or.push(condition);
  }

  //Ahora, agregamos los ors a las condiciones ya existentes
  if (!settings.where) {
    settings.where = {};
  }
  if (!settings.where.$or) {
    settings.where.$or = [];
  }
  settings.where.$or = [...settings.where.$or, ...or];
});

/**
 * Agrega los filtros al setting pasado como parametro. Las nuevas condiciones
 * son agregadas como and a lo que ya exista en el setting.
 * @param setting el setting de sequelize.
 * @param baseModelel modelo base sobre el que se esta trabajando
 * @param filters los filtros. Cada filtro debe necesariamente tener el formato:
 *  {
 *      path: {
 *          condiciones....
 *       }
 *  }
 * Filtros sin el formato especificado tendran comportamiento incorrecto, deben manejarse
 * manualmente.
 */
const addFiltersToSettings = (exports.addFiltersToSettings = (
  settings,
  baseModel,
  filters
) => {
  if (!filters || filters.length === 0) {
    return;
  }

  if (!settings.where) {
    settings.where = {};
  }

  for (let filter of filters) {
    let paths = Object.keys(filter);
    //Por cada uno de los paths de cada filtro, agregamos dicho path al settings
    //y transferimos sus condiciones al settings
    for (let path of paths) {
      addPathToSettings(path, settings, baseModel);
      let key = path.split('.').length > 1 ? '$' + path + '$' : path;
      if (settings.where[key]) {
        settings.where[key] = Object.assign(settings.where[key], filter[path]);
      } else {
        settings.where[key] = filter[path];
      }
    }
  }
});

/**
 * Agrega ordenamiento al settings pasado como parametro.
 * @param settings los settings sequelize que se estan construyendo.
 * @param baseModel el modelo sequelize base.
 * @param orders la lista de order. Debe tener la siguiente estructura:
 * [
 *  ["path1", "ASC"],
 *  ["path2", "DESC"]......
 * ]
 */
const addOrderToSettings = (exports.addOrderToSettings = (
  settings,
  baseModel,
  orders
) => {
  if (!orders || orders.length === 0) {
    return;
  }
  if (!settings.order) {
    settings.order = [];
  }
  for (const order of orders) {
    addPathToSettings(order[0], settings, baseModel);
    //settings.order.push([`"${order[0]}"`, order[1]]);
    settings.order.push([...order[0].split('.'), order[1]]);
  }
});

/**
 * Agrega paginacion al settings pasado como parametro.
 * @param settings los settings sequelize que se estan construyendo.
 * @param baseModel el modelo sequelize base.
 * @param paging la informacion de paging. Debe tener la siguiente estructura
 * {
 *  page: X,
 *  pageSize: Y
 * }
 */
const addPagingToSettings = (exports.addPagingToSettings = (
  settings,
  baseModel,
  paging
) => {
  const DEFAULT_PAGE_SIZE = 10;
  const DEFAULT_PAGE = 1;
  let pageSize = DEFAULT_PAGE_SIZE;
  if (paging.pageSize) {
    pageSize = paging.pageSize;
  }
  let page = DEFAULT_PAGE;
  if (paging.page) {
    page = paging.page;
  }

  const offset = (page - 1) * pageSize;
  const limit = pageSize;
  settings.offset = offset;
  settings.limit = limit;
});

/**
 * Agrega un inclusion de relacion a un setting que se debe encontrar inicializado.
 *
 * @example
 * <code>
 * const settings = utils.constructSettings({}, db.sequelize.Usuario, filters, orders, paging, generalFilter);
 * utils.addIncludeToSetting(settings, db.sequelize.Hotel, 'hotel');
 * utils.addIncludeToSetting(settings, db.sequelize.Tipo, 'tipo');
 * return await db.sequelize.Usuario.findAndCountAll(settings);
 * </code>
 * @param {object} setting
 * @param {object} model
 * @param {string} alias
 */
const addIncludeToSetting = (exports.addIncludeToSetting = (
  settings,
  model,
  alias
) => {
  if (!settings.include) {
    settings.include = [];
  }
  let subsetting = settings.include.filter(x => x.as === alias)[0];
  if (!subsetting) {
    subsetting = {
      model: model,
      as: alias
    };
    settings.include.push(subsetting);
  }
  delete subsetting.attributes;
});

/**
 * Retorna un array de paths basicos del modelo que pueden ser utilizados posteriormente para
 * la comparacion del filtro general. Por defecto, incluye todos los atributos basicos
 * del modelo excluyendo los campos created_at, updated_at, deleted_at e id
 * @param {Object} baseModel
 */
const constructPathsToCompare = (exports.constructPathsToCompare = baseModel => {
  const pathsExcluded = ['created_at', 'updated_at', 'deleted_at', 'id'];
  //Incluimos los paths del model que no se encuentran en el array de paths excluidos
  const pathsToCompare = Object.keys(baseModel.rawAttributes).filter(
    x => pathsExcluded.indexOf(x) < 0
  );
  return pathsToCompare;
});

/**
 * * Retorna un array de paths del modelo que pueden ser utilizados posteriormente para
 * la comparacion del filtro general. Incluye todos los campos resultantes de
 * llamar a constructPathsToCompare, y se agrega los elementos del array pasado como parametro.
 *
 * @example
 *
 * <code>
 * const pathsInGeneralFilter = utils.constructExtendedPathsToCompare(
 *          db.sequelize.Usuario, ['tipo.nombre', 'hotel.nombre'])
 * const settings = utils.constructSettings({}, db.sequelize.Usuario, filters,
 *          orders, paging, generalFilter, pathsInGeneralFilter);
 * utils.addIncludeToSetting(settings, db.sequelize.Hotel, 'hotel');
 * utils.addIncludeToSetting(settings, db.sequelize.Tipo, 'tipo');
 * return await db.sequelize.Usuario.findAndCountAll(settings);
 * </code>
 *
 * @param {Object} baseModel
 * @param {string[]} extendedPaths
 */
const constructExtendedPathsToCompare = (exports.constructExtendedPathsToCompare = (
  baseModel,
  extendedPaths
) => {
  return [...constructPathsToCompare(baseModel), ...extendedPaths];
});
