'use strict';

const Joi = require('joi');
const parse = require('./parseGidOnline');

module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: {
      file: './build/index.html'
    }
  },
  {
    method: 'GET',
    path: '/{path*}',
    config: {
      cache: {
        privacy: 'public',
        expiresIn: 31536000000 // 1 year in milliseconds
      }
    },
    handler: {
      directory: { path: './build' }
    }
  },
  {
    method: 'GET',
    path: '/api/parse',
    handler: function ({ query }, reply) {
      parse(query.url)
        .then(reply)
        .catch(e => {
            console.error(e);
            reply({ error: e.message, details: e.details }).code(500);
        });
    }
  },
];