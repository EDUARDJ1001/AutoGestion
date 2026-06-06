const swaggerUi = require('swagger-ui-express');
const openapi = require('./openapi');

const setupSwagger = (app) => {
  app.get('/api/docs.json', (req, res) => {
    res.json(openapi);
  });

  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      explorer: true,
      customSiteTitle: 'AutoGestion API Docs'
    })
  );
};

module.exports = setupSwagger;
