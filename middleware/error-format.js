const Boom = require('boom');

/**
 * Middleware que se encarga de unificar las respuestas ante errores que ocurren en el procesamiento.
 * El error capturado deberia ser un error Boom. 
 * En caso de que el error que es capturado por el middleware no sea Boom, inicializa un error
 * Boom del tipo bad implementation como default, y lo retorna como respuesta.
 * @param {* el request context de koa} ctx 
 * @param {* el siguiente middleware en la cadena} next 
 */
const errorFormatMiddleware = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.log('Error', JSON.stringify(error));
    //Tratamiento de error para caso de error de autenticacion. El middleware de autenticacion no manda
    //un error Boom, asi que lo convertimos
    if (error.status === 401 && !error.isBoom) {
      const message = 'No autorizado. El request debe contener un token valido en Authentication header, Bearer <token>.';
      error = Boom.unauthorized(message);
    }
    //Si el error no es un Boom error, hacemos default a un bad implementation
    if (!error.isBoom) {
      error = Boom.badImplementation();
    }
    //Tratamiento de errores Boom
    ctx.status = error.output.statusCode;
    ctx.body = error.output;
  }

}

module.exports = errorFormatMiddleware;