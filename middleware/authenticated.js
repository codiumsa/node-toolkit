const jwt = require('koa-jwt');

module.exports = jwt({
  secret: 'POSBACK', // Should not be hardcoded
  key: 'loginData'
});
