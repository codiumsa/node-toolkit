const fs = require('fs');
const path = require('path');
var appDir = path.dirname(require.main.filename);
const Sequelize = require('sequelize');
const nconf = require.main.require(appDir + "/config");

const username = nconf.get('database:user');
const password = nconf.get('database:password');
const dbName = nconf.get('database:name');

const options = {
    dialect: "postgres",
    port: 5432
};
const client = new Sequelize(dbName, username, password, options);
const models = {};


fs
    .readdirSync(appDir + '/data/models')
    .filter(function (file) {
        return (file.indexOf('.') !== 0) && (file !== 'index.js');
    })
    .forEach(function (file) {
        var model = client.import(path.join(appDir + '/data/models', file));
        models[model.name] = model;
    });

Object.keys(models).forEach(function (modelName) {
    if (models[modelName].options.hasOwnProperty('associate')) {
        models[modelName].options.associate(models);
    }
});

module.exports = models;
module.exports.client = client;
module.exports.Sequelize = client.Sequelize;
