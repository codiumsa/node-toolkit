const path = require('path');

/**
 * Obtiene el path a la aplicación que está usando a node-toolkit como
 * dependencia. Si no se está usando el módulo como dependencia se retorna
 * require.main.filename (esto ultimo podría ser incompatible con aplicaciones 
 * ejecutadas desde iisnode en Windows/Azure ya que require.main.filename
 * retornaria un path similar a D:\Program Files (x86)\iisnode).
 */
function getAppDir() {
  // Se controla si el módulo está siendo utilizado como dependencia.
  if(__dirname.includes('/node_modules/node-toolkit/')){
    return __dirname.split('/node_modules/node-toolkit/')[0];
  }
  return path.dirname(require.main.filename);
}

exports.appDir = getAppDir();
