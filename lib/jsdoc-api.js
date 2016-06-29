'use strict'
const ExplainStream = require('./explain-stream')
const jsdoc = require('./jsdoc')
const path = require('path')
const homePath = require('home-path')
const fs = require('then-fs')

const CACHE_DIR = path.resolve(homePath(), '.jsdoc-api')

try {
  fs.mkdirSync(CACHE_DIR)
} catch (err) {
  // exists
}

/**
 * A programmatic interface for [jsdoc3](https://github.com/jsdoc3/jsdoc) with a few extra features.
 *
 * - Provides sync, async (Promise) and streaming interfaces for the two main jsdoc operations ('explain' and 'render documentation').
 * - Supply source code via a string, a set of file names or a stream.
 * - Optional caching, dramatically boosting subsequent run performance on the same input.
 * - Supports `.html` input files documenting the contained javascript.
 *
 * @module jsdoc-api
 * @typicalname jsdoc
 * @example
 * > const jsdoc = require('jsdoc-api')
 *
 * > jsdoc.explain({ source: '/** example doclet *∕ \n var example = true' }).then(output => console.log(output))
 *
 * [ { comment: '/** example doclet *∕',
 *     meta:
 *      { range: [ 28, 42 ],
 *        filename: 'nkrf18zlymohia4i29a0zkyt84obt9.js',
 *        lineno: 2,
 *        path: '/var/folders/74/tqh7thm11tq72d7sjty9qvdh0000gn/T',
 *        code:
 *         { id: 'astnode100000002',
 *           name: 'example',
 *           type: 'Literal',
 *           value: true } },
 *     description: 'example doclet',
 *     name: 'example',
 *     longname: 'example',
 *     kind: 'member',
 *     scope: 'global' },
 *   { kind: 'package',
 *     longname: 'package:undefined',
 *     files: [ '/var/folders/74/tqh7thm11tq72d7sjty9qvdh0000gn/T/nkrf18zlymohia4i29a0zkyt84obt9.js' ] } ]
 */
exports.explain = explain
exports.createExplainStream = createExplainStream
exports.render = render
exports.clean = clean
exports.CACHE_DIR = CACHE_DIR

/**
 * Returns a promise for the jsdoc explain output.
 *
 * @param [options] {module:jsdoc-api~JsdocOptions}
 * @fulfil {object[]} - jsdoc explain output
 * @returns {Promise}
 * @static
 */
function explain (options) {
  options = new JsdocOptions(options)
  const jsdocExplain = new jsdoc.Explain(options)
  return jsdocExplain.execute()
}

/**
 * Returns a duplex stream, into which you can pipe source code and receive explain output at the other end.
 *
 * @param [options] {module:jsdoc-api~JsdocOptions}
 * @returns {Duplex}
 * @static
 * @example
 * fs.createReadStream('source-code.js')
 *   .pipe(jsdoc.createExplainStream())
 *   .pipe(process.stdout)
 */
function createExplainStream (options) {
  options = new JsdocOptions(options)
  return new ExplainStream(explain, options)
}

/**
 * Render jsdoc documentation.
 *
 * @param [options] {module:jsdoc-api~JsdocOptions}
 * @prerequisite Requires node v0.12 or above
 * @static
 * @example
 * jsdoc.render({ files: 'lib/*', destination: 'api-docs' })
 */
function render (options) {
  options = new JsdocOptions(options)
  const render = new jsdoc.Render(options)
  return render.execute()
}

/**
 * Clean the cache.
 * @returns {Promise}
 * @static
 */
function clean () {
  return fs.readdir(CACHE_DIR)
    .then(files => {
      const promises = files.map(file => fs.unlink(path.resolve(CACHE_DIR, file)))
      return Promise.all(promises)
    })
}

/**
 * The jsdoc options, common for all operations.
 * @typicalname options
 */
class JsdocOptions {
  constructor (options) {
    /**
     * One or more filenames to process. Either this or `source` must be supplied.
     * @type {string|string[]}
     */
    this.files = []

    /**
     * A string containing source code to process. Either this or `source` must be supplied.
     * @type {string}
     */
    this.source = undefined

    /**
     * Only display symbols with the given access: "public", "protected", "private" or "undefined", or "all" for all access levels. Default: all except "private".
     * @type {string}
     */
    this.access = undefined

    /**
     * The path to the configuration file. Default: path/to/jsdoc/conf.json.
     * @type {string}
     */
    this.configure = undefined

    /**
     * The path to the output folder. Use "console" to dump data to the console. Default: ./out/.
     * @type {string}
     */
    this.destination = undefined

    /**
     * Assume this encoding when reading all source files. Default: utf8.
     * @type {string}
     */
    this.encoding = undefined

    /**
     * Display symbols marked with the @private tag. Equivalent to "--access all". Default: false.
     * @type {boolean}
     */
    this.private = undefined

    /**
     * The path to the project's package file. Default: path/to/sourcefiles/package.json
     * @type {string}
     */
    this.package = undefined

    /**
     * Treat errors as fatal errors, and treat warnings as errors. Default: false.
     * @type {boolean}
     */
    this.pedantic = undefined

    /**
     * A query string to parse and store in jsdoc.env.opts.query. Example: foo=bar&baz=true.
     * @type {string}
     */
    this.query = undefined

    /**
     * Recurse into subdirectories when scanning for source files and tutorials.
     * @type {boolean}
     */
    this.recurse = undefined

    /**
     * The path to the project's README file. Default: path/to/sourcefiles/README.md.
     * @type {string}
     */
    this.readme = undefined

    /**
     * The path to the template to use. Default: path/to/jsdoc/templates/default.
     * @type {string}
     */
    this.template = undefined

    /**
     * Directory in which JSDoc should search for tutorials.
     * @type {string}
     */
    this.tutorials = undefined

    /**
     * Enable experimental parsing of `.html` files.
     * @type {boolean}
     */
    this.html = undefined

    Object.assign(this, options)
    if (this.html) {
      this.configure = path.resolve(__dirname, 'html-conf.json')
      delete this.html
    }
  }
}
