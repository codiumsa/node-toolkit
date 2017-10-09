
/**
 * Construye un object que contiene los errores de validacion reportados 
 * por el error de sequelize
 * sequelizeError es el error lanzado por sequelize.
 * El object de salida es:
 * {
 *  path1: mensaje1,
 *  path2: mensaje2
 * }
 */
const mapSequelizeError = exports.mapSequelizeError = sequelizeError => {
    let validationErrors = {};
    if (sequelizeError.errors) {
        validationErrors = sequelizeError.errors.reduce((constructing, error) => {
            if (error.path) {
                constructing[error.path] = error.message;
            }
            return constructing;
        }, validationErrors);
    }
    return validationErrors;
}