/**
 * Este middleware puede utilizarse para agregar control de autenticación vía JWT
 * a los endpoint de la api.
 * 
 * @example
 * 
 * const authenticated = require('node-toolkit/middleware/authenticated');
 * const Koa = require('koa');
 * const app = new Koa();
 * 
 * app.use(authenticated.unless({ path: [/^\/p/] }));
 * 
 * @since 0.1.0
 */
const jwt = require('koa-jwt');
const path = require('path');
var appDir = path.dirname(require.main.filename);

const nconf = require.main.require(appDir + '/config');


module.exports = jwt({
  secret: nconf.get('jwt:secret'),
  key: 'loginData'
});
