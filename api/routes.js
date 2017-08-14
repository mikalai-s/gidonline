'use strict';

const Joi = require('joi');
const axios = require('axios');
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
  {
    method: 'GET',
    path: '/api/stream',
    handler: function ({ query }, reply) {
      axios({
        method: 'GET',
        url: query.url,
        responseType: 'stream'
      })
        .then(function (response) {
          reply(response.data);
        });
    }
  }
];