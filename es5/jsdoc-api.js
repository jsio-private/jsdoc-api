'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ExplainStream = require('./explain-stream');
var jsdoc = require('./jsdoc');
var path = require('path');
var homePath = require('home-path');
var fs = require('then-fs');

var CACHE_DIR = path.resolve(homePath(), '.jsdoc-api');

try {
  fs.mkdirSync(CACHE_DIR);
} catch (err) {}

exports.explainSync = explainSync;
exports.explain = explain;
exports.createExplainStream = createExplainStream;
exports.renderSync = renderSync;
exports.clean = clean;
exports.CACHE_DIR = CACHE_DIR;

function explainSync(options) {
  options = new JsdocOptions(options);
  var jsdocExplainSync = new jsdoc.ExplainSync(options);
  return jsdocExplainSync.execute();
}

function explain(options) {
  options = new JsdocOptions(options);
  var jsdocExplain = new jsdoc.Explain(options);
  return jsdocExplain.execute();
}

function createExplainStream(options) {
  options = new JsdocOptions(options);
  return new ExplainStream(explain, options);
}

function renderSync(options) {
  options = new JsdocOptions(options);
  var render = new jsdoc.RenderSync(options);
  return render.execute();
}

function clean() {
  return fs.readdir(CACHE_DIR).then(function (files) {
    var promises = files.map(function (file) {
      return fs.unlink(path.resolve(CACHE_DIR, file));
    });
    return Promise.all(promises);
  });
}

var JsdocOptions = function JsdocOptions(options) {
  _classCallCheck(this, JsdocOptions);

  this.files = [];

  this.source = undefined;

  this.access = undefined;

  this.configure = undefined;

  this.destination = undefined;

  this.encoding = undefined;

  this.private = undefined;

  this.package = undefined;

  this.pedantic = undefined;

  this.query = undefined;

  this.recurse = undefined;

  this.readme = undefined;

  this.template = undefined;

  this.tutorials = undefined;

  this.html = undefined;

  Object.assign(this, options);
  if (this.html) {
    this.configure = path.resolve(__dirname, 'html-conf.json');
    delete this.html;
  }
};