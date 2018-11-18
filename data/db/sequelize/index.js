const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const utils = require('../../../utils');

const { appDir } = utils.pathUtils;
const nconf = require.main.require(`${appDir}/config`);

const username = nconf.get('database:user');
const password = nconf.get('database:password');
const dbName = nconf.get('database:name');
const options = nconf.get('database:options');

const client = new Sequelize(dbName, username, password, options);
const models = {};


fs
  .readdirSync(`${appDir}/data/models`)
  .filter(file => (file.indexOf('.') !== 0) && (file !== 'index.js'))
  .forEach((file) => {
    const model = client.import(path.join(`${appDir}/data/models`, file));
    models[model.name] = model;
  });

Object.keys(models).forEach((modelName) => {
  if (models[modelName].hasOwnProperty('associate')) {
    models[modelName].associate(models);
  }
});

module.exports = models;
module.exports.client = client;
module.exports.Sequelize = client.Sequelize;
