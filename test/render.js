var test = require('blue-tape')
var jsdoc = require('../')
var Fixture = require('./lib/fixture')
var fs = require('fs')

test('.render({ files })', function (t) {
  Fixture.createTmpFolder('tmp')
  var f = new Fixture('class-all')
  return jsdoc.render({ files: f.sourcePath, destination: 'tmp' }).then(function (output) {
    t.doesNotThrow(function () {
      fs.statSync('./tmp/index.html')
    })
  })
})

test('.render({ source, destination })', function (t) {
  t.plan(1)
  Fixture.createTmpFolder('tmp')
  var f = new Fixture('class-all')
  return jsdoc.render({ source: f.getSource(), destination: 'tmp' }).then(function (output) {
    t.doesNotThrow(function () {
      fs.statSync('./tmp/index.html')
    })
  })
})
