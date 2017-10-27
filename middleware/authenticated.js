const jwt = require('koa-jwt');
const path = require('path');
var appDir = path.dirname(require.main.filename);

const nconf = require.main.require(appDir + '/config');


module.exports = jwt({
  secret: nconf.get('jwt:secret'),
  key: 'loginData'
});
