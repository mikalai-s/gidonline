'use strict';

const Hapi = require('hapi');
const Inert = require('inert');

const config = require('./config.json');
const routes = require('./routes');

const server = new Hapi.Server();
server.connection({ port: process.env.PORT || config.apiPort });

server.ext('onPreResponse', function (request, reply) {
  // show error stack
  if (request.response.isBoom) {
    if (request.response.output.statusCode === 404) {
      // in case of not found error - just show url of a requested resource
      console.warn('Not found ' + request.url.href);
    } else {
      console.error(request.response);
    }
  }
  return reply.continue();
});

server.on('request-error', function (request, err) {
  console.error(err);
});

server.register(
  [Inert],
  function (err) {
    if (err) {
      return console.error(err);
    }

    // register routes
    server.route(routes);

    // start server
    server.start(err => {
      if (err) {
        console.error(err);
      }
    });
  });


