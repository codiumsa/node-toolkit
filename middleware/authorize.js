const Boom = require('boom');
const jwt = require('jsonwebtoken');
const path = require('path');

const authorizationMiddleware = userPermFinder => requiredParams => {
  return async (ctx, next) => {
    console.log('Se solicitan los permisos', requiredParams);
    console.log('Se ha encontrado en el header', JSON.stringify(ctx.headers));

    const { user } = ctx.state.loginData;
    let userPerms = await userPermFinder(user.id);
    userPerms = userPerms.map(perm => perm.nombre);
    console.log(`Los permisos del usuario ${user.username}`, JSON.stringify(userPerms));
    let authorized = true;
    const missingPerms = [];

    for (const perm of requiredParams) {
      if (!(userPerms.indexOf(perm) > -1)) {
        authorized = false;
        missingPerms.push(perm);
      }
    }
    if (authorized) {
      console.log('Usuario autorizado');
      await next();
    } else {
      console.log('Usuario no autorizado, verifique con su administrador los permisos faltantes', missingPerms);
      throw Boom.forbidden('No cuenta con los permisos necesarios');
    }
  }
}
module.exports = authorizationMiddleware;