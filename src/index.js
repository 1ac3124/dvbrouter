#!/usr/bin/env nodejs

import Hapi from 'hapi';
import Request from 'request';

import config from './config';
import { closeProcess, checkOpenedInstances } from './manager';
import Router from './router';

closeProcess();
const router = new Router();

const openConnections = () => {
  const server = new Hapi.Server();

  server.connection(
      config.server,
  );

  server.route({
    method: 'GET',
    path: '/',
    handler: (request, reply) => {
      reply('MumuDVB router is alive!');
    },
  });

  server.route({
    method: 'GET',
    path: '/status',
    handler: (request, reply) => {
      reply(router.getStatus());
    },
  });

  server.route({
    method: 'GET',
    path: '/playlist',
    handler: (request, reply) => {
      reply(router.buildPlaylist(request.connection.info.protocol, request.info.host))
        .header('Content-Type', 'audio/x-mpegurl')
        .header("Content-Disposition", "attachment; filename=" + 'playlist.m3u');
    },
  });

  server.route({
    method: 'GET',
    path: '/stream/{id}',
    handler: (request, reply) => {
      router.onConnect(request, (err, data) => {
        if (err) {
          console.error(err);
          return reply(err).code(500);
        }
        const url = `${request.connection.info.protocol}://${request.info.hostname}:${data.port}/bysid/${data.channel.service_id}`;
        return reply.redirect(url);
      });
    },
  });

  server.start((err) => {
    if (err) {
      throw err;
    }
    console.info('DVB server running at:', server.info.uri);
    setInterval(checkOpenedInstances, 5000);
  });

};

router.init(config.mumudvb, openConnections);
