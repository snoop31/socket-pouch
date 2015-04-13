'use strict';

var PouchDB = require('pouchdb');
var Promise = require('bluebird');
var utils = require('../shared/utils');
var dbs = {};

function sendError(socket, messageId, data) {
  console.log('sending error', messageId, data);
  socket.send(messageId + ':0:' + JSON.stringify(data));
}

function sendSuccess(socket, messageId, data) {
  console.log('sending success', messageId, data);
  socket.send(messageId + ':1:' + JSON.stringify(data));
}

function sendUpdate(socket, messageId, data) {
  console.log('sending update', messageId, data);
  socket.send(messageId + ':2:' + JSON.stringify(data));
}

function dbMethod(socket, methodName, messageId, args) {
  Promise.resolve().then(function () {
    var db = dbs['$' + socket.id];
    return db[methodName].apply(db, args);
  }).then(function (res) {
    sendSuccess(socket, messageId, res);
  }).catch(function (err) {
    sendError(socket, messageId, err);
  });
}

function liveChanges(socket, messageId, args) {
  var db = dbs['$' + socket.id];
  var changes = db.changes(args[0]);
  changes.on('change', function (change) {
    sendUpdate(socket, messageId, change);
  }).on('complete', function (change) {
    changes.removeAllListeners();
    changes.cancel();
    sendSuccess(socket, messageId, change);
  }).on('error', function (change) {
    changes.removeAllListeners();
    changes.cancel();
    sendError(socket, messageId, change);
  });
}

function onReceiveMessage(socket, type, messageId, args) {
  console.log('onReceiveMessage', type, messageId, args);
  switch (type) {
    case 'createDatabase':
      dbs['$' + socket.id] = new PouchDB(args[0]);
      sendSuccess(socket, messageId, {ok: true});
      return;
    case 'id':
      sendSuccess(socket, messageId, socket.id);
      return;
    case 'info':
    case 'destroy':
    case 'put':
    case 'allDocs':
    case 'bulkDocs':
    case 'post':
    case 'get':
    case 'remove':
    case 'getAttachment':
    case 'removeAttachment':
    case 'putAttachment':
    case 'changes':
      return dbMethod(socket, type, messageId, args);
    case 'liveChanges':
      return liveChanges(socket, messageId, args);
    default:
      return sendError(socket, messageId, {error: 'unknown API method: ' + type});
  }
}

function socketPouchServer(port) {
  var engine = require('engine.io');
  var server = engine.listen(port);

  server.on('connection', function(socket) {
    socket.on('message', function (message) {
      var split = utils.parseMessage(message, 3);
      var type = split[0];
      var messageId = split[1];
      var args = JSON.parse(split[2]);
      onReceiveMessage(socket, type, messageId, args);
    });
  });
}

module.exports = socketPouchServer;