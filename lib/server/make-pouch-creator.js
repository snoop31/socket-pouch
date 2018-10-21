'use strict';

var PouchDB = require('pouchdb');
var Promise = require('bluebird');

function createLocalPouch(args) {
  var opt;
  if (typeof args[0] === 'string') {
    opt = args[1] || {};
    //args = [{name: args[0]}];
    !opt.name && (opt.name = args[0]);
    opt.name = opt.name.replace('.', '').replace('/', '');
  }else{
    opt = args[0] || {};
  }

  // TODO: there is probably a smarter way to be safe about filepaths
  //args[0].name = args[0].name.replace('.', '').replace('/', '');
  return Promise.resolve({
    pouch: new PouchDB(opt)
  });
}

function createHttpPouch(options) {
  var remoteUrl = options.remoteUrl;
  // chop off last '/'
  if (remoteUrl[remoteUrl.length - 1] === '/') {
    remoteUrl = remoteUrl.substring(0, remoteUrl.length -1);
  }
  return function (args) {
    var opt;
    if (typeof args[0] === 'string') {
      opt = args[1] || {};
      //args = [{name: args[0]}];
      !opt.name && (opt.name = args[0]);
    }else{
      opt = args[0] || {};
    }
    opt.name = remoteUrl + '/' + opt.name;
    return Promise.resolve({
      pouch: new PouchDB(opt)
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
    var opt;
    if (typeof args[0] === 'string') {
      opt = args[1] || {};
      //args = [{name: args[0]}];
      !opt.name && (opt.name = args[0]);
      opt.name = opt.name.replace('.', '').replace('/', '');
    }else{
      opt = args[0] || {};
    }    
    var res = options.pouchCreator(opt);
    if (res instanceof PouchDB) {
      return Promise.resolve({pouch: res});
    }
    return res;
  };
}

module.exports = makePouchCreator;
