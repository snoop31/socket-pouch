'use strict';

var PouchDB = require('pouchdb');
var Promise = require('bluebird');

function createLocalPouch(args) {
  var options;
  if (typeof args[0] === 'string') {
    options = args[1] || {};
    //args = [{name: args[0]}];
    !options.name && (options.name = args[0]);
    options.name = options.name.replace('.', '').replace('/', '');
  }else{
    options = args[0] || {};
  }

  // TODO: there is probably a smarter way to be safe about filepaths
  //args[0].name = args[0].name.replace('.', '').replace('/', '');
  return Promise.resolve({
    pouch: new PouchDB(options)
  });
}

function createHttpPouch(options) {
  var remoteUrl = options.remoteUrl;
  // chop off last '/'
  if (remoteUrl[remoteUrl.length - 1] === '/') {
    remoteUrl = remoteUrl.substring(0, remoteUrl.length -1);
  }
  return function (args) {
    var options;
    if (typeof args[0] === 'string') {
      options = args[1] || {};
      //args = [{name: args[0]}];
      !options.name && (options.name = args[0]);
    }else{
      options = args[0] || {};
    }
    options.name = remoteUrl + '/' + options.name;
    return Promise.resolve({
      pouch: new PouchDB(options)
    });
  };
}

function makePouchCreator(options) {
  if (options.remoteUrl) {
    return createHttpPouch(options);
  }
  if (!options.pouchCreator) {
    return createLocalPouch;
  }
  return function (args) {
    var options;
    if (typeof args[0] === 'string') {
      options = args[1] || {};
      //args = [{name: args[0]}];
      !options.name && (options.name = args[0]);
      options.name = options.name.replace('.', '').replace('/', '');
    }else{
      options = args[0] || {};
    }    
    var res = options.pouchCreator(options);
    if (res instanceof PouchDB) {
      return Promise.resolve({pouch: res});
    }
    return res;
  };
}

module.exports = makePouchCreator;
