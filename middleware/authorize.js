const Boom = require('boom');
var jwt = require('jsonwebtoken');

const authorizationMiddleware = userPermFinder => requiredParams => {
    return async (ctx, next) => {
        console.log('Se solicitan los permisos', requiredParams);
        console.log('Se ha encontrado en el header', JSON.stringify(ctx.headers));
        let supervisorPerms = [];
        if (ctx.headers.supervisor) {
            try {
                const decoded = jwt.verify(ctx.headers.supervisor, 'POSBACK', [options, callback])
                supervisorPerms = decoded.permissions;
                console.log('Se ha encontrado una cabecera de autorizacion valida, se aplicara a la verificacion de permisos');
            } catch (error) {
                console.log('Se esta enviando una cabecera de supervisio invalida');
                supervisorPerms = [];
            }
        }
        const { user } = ctx.state.loginData;
        let userPerms = await userPermFinder(user.id);
        userPerms = userPerms.map(perm => perm.nombre);
        if (supervisorPerms) {
            userPerms = [...userPerms, ...supervisorPerms];
        }
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