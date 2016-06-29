'use strict'
const path = require('path')
const assert = require('assert')
const walkBack = require('walk-back')
const spawn = require('child_process').spawn
const toSpawnArgs = require('object-to-spawn-args')
const arrayify = require('array-back')
const collectAll = require('collect-all')
const TempFile = require('./temp-file')
const FileSet = require('file-set')
const homePath = require('home-path')
const fs = require('then-fs')
const debug = require('debug')

const CACHE_DIR = path.resolve(homePath(), '.jsdoc-api')

/**
 * @module jsdoc
 */

const jsdocPath = walkBack(
  path.join(__dirname, '..'),
  path.join('node_modules', 'jsdoc-75lb', 'jsdoc.js')
)

/**
 * Command base class. The command `receiver` being the `child_process` module.
 * @abstract
 */
class JsdocCommand {
  constructor (options) {
    require('promise.prototype.finally')

    this.debug = debug('JsdocCommand')

    options = options || {}
    options.files = arrayify(options.files)

    this.tempFile = null
    if (options.source) this.tempFile = new TempFile(options.source)

    const jsdocOptions = Object.assign({}, options)
    delete jsdocOptions.files
    delete jsdocOptions.source
    delete jsdocOptions.cache

    this.options = options
    this.jsdocOptions = jsdocOptions
  }

  /**
   * Template method returning the jsdoc output. Invoke later (for example via a command-queuing system) or immediately as required.
   *
   * 1. preExecute
   * 2. validate
   * 3. getOutput
   * 4. postExecute
   *
   */
  execute () {
    return this.preExecute().then(() => {
        return this.validate()
      }).then(() => {
        return this.getOutput()
      }).then(output => {
        this.output = output
        return output
      }).finally(() => {
        return this.postExecute().finally(() => {
          return this.output
        })
      });
  }

  /**
   * Perform pre-execution processing here, e.g. expand input glob patterns.
   */
  preExecute () {
    return new Promise((resolve, reject) => {
      this.inputFileSet = new FileSet(this.options.files)
      resolve()
    });
  }

  /**
   * Return an Error instance if execution should not proceed.
   * @returns {Promise}
   */
  validate () {
    return new Promise((resolve, reject) => {
      assert.ok(
        this.options.files.length || this.options.source,
        'Must set either .files or .source'
      )

      if (this.inputFileSet.notExisting.length) {
        const err = new Error('These files do not exist: ' + this.inputFileSet.notExisting)
        err.name = 'JSDOC_ERROR'
        reject(err)
        return
      }

      resolve()
    });
  }

  /**
   * perform post-execution cleanup
   */
  postExecute () {
    return new Promise((resolve, reject) => {
      if (this.tempFile) {
        this.tempFile.delete()
      }
      resolve()
    });
  }

  verifyOutput (code, output) {
    let parseFailed = false
    let parsedOutput
    if (output && output.stdout) {
      try {
        parsedOutput = JSON.parse(output.stdout)
      } catch (err) {
        parseFailed = true
      }
    }

    if (code > 0 || parseFailed) {
      const firstLineOfStdout = output.stdout.split(/\r?\n/)[0]
      const err = new Error(output.stderr.trim() || firstLineOfStdout || 'Jsdoc failed.')
      err.name = 'JSDOC_ERROR'
      throw err
    } else {
      return parsedOutput
    }
  }

  spawnAsync (jsdocArgs) {
    return new Promise((resolve, reject) => {
      const jsdocOutput = {
        stdout: '',
        stderr: '',
        collectInto (dest) {
          return collectAll(data => { this[dest] = data.toString() })
        }
      }

      this.debug('spawning node with args: ' + (Array.isArray(jsdocArgs) ? jsdocArgs.join(' ') : jsdocArgs))
      const handle = spawn('node', jsdocArgs)
      handle.stderr.pipe(jsdocOutput.collectInto('stderr'))
      handle.stdout.pipe(jsdocOutput.collectInto('stdout'))

      handle
        .on('close', code => {
          this.debug('spawn closed. rc= ' + code)
          try {
            resolve(this.verifyOutput(code, jsdocOutput))
          } catch (err) {
            reject(err)
          }
        })
    })
  }
}

/**
 * @extends module:jsdoc~JsdocCommand
 * @static
 */
class Explain extends JsdocCommand {
  constructor (options) {
    super(options)
    this.debug.namespace += ':Explain'
  }

  getOutput () {
    return this.checkCache()
      .then(cachedOutput => {
        if (cachedOutput) {
          return cachedOutput
        }
        const jsdocArgs = toSpawnArgs(this.jsdocOptions)
          .concat([ '-X' ])
          .concat(this.options.source ? this.tempFile.path : this.inputFileSet.files)
        jsdocArgs.unshift(jsdocPath)
        return this.spawnAsync(jsdocArgs).then(explainOutput => {
          fs.writeFileSync(this.cachePath, JSON.stringify(explainOutput))
          return explainOutput
        });
      })
  }

  /**
   * Returns a cached recordset or null
   * @returns {Promise}
   * @fulfil {object[]}
   */
  checkCache () {
    const crypto = require('crypto')
    const hash = crypto.createHash('sha1')

    const promises = this.inputFileSet.files.map(file => fs.readFile(file))

    return Promise.all(promises)
      .then(contents => {
        contents.forEach(content => hash.update(content))
        hash.update(this.inputFileSet.files.join())
        this.checksum = hash.digest('hex')
        this.cachePath = path.resolve(CACHE_DIR, this.checksum)

        try {
          return JSON.parse(fs.readFileSync(this.cachePath, 'utf8'))
        } catch (err) {
          return null
        }
      })
      .catch(err => console.error(err.stack))
  }
}

/**
 * @static
 */
class Render extends JsdocCommand {
  constructor (options) {
    super(options)
    this.debug.namespace += ':Render'
  }

  getOutput () {
    const jsdocArgs = toSpawnArgs(this.jsdocOptions)
      .concat(this.options.source ? this.tempFile.path : this.options.files)
    jsdocArgs.unshift(jsdocPath)
    return this.spawnAsync(jsdocArgs);
  }
}

exports.Explain = Explain
exports.Render = Render
