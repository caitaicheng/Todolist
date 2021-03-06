/* eslint-disable no-console */
process.env.NODE_ENV = 'production'

const { say } = require('cfonts')
const chalk = require('chalk')
const del = require('del')
const Multispinner = require('multispinner')
const webpack = require('webpack')

const main = require('./webpack.main.config')
const renderer = require('./webpack.renderer.config')

const errorLog = `${chalk.bgRed.white(' ERROR ')} `
const okayLog = `${chalk.bgBlue.white(' OKAY ')} `
const isCI = process.env.CI || false

function pack(config) {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) reject(err.stack || err)
      else if (stats.hasErrors()) {
        let error = ''

        stats
          .toString({
            chunks: false,
            colors: true,
          })
          .split(/\r?\n/)
          .forEach(line => {
            error += `    ${line}\n`
          })

        reject(error)
      } else {
        resolve(
          stats.toString({
            chunks: false,
            colors: true,
          }),
        )
      }
    })
  })
}

function greeting() {
  const cols = process.stdout.columns
  let text = ''

  if (cols > 85) text = 'lets-build'
  else if (cols > 60) text = 'lets-|build'
  else text = false

  if (text && !isCI) {
    say(text, {
      colors: ['yellow'],
      font: 'simple3d',
      space: false,
    })
  } else console.log(chalk.yellow.bold('\n  lets-build'))
  console.log()
}

function build() {
  greeting()

  del.sync(['dist/electron/*', '!.gitkeep'])

  const tasks = ['main', 'renderer']
  const m = new Multispinner(tasks, {
    preText: 'building',
    postText: 'process',
  })

  let results = ''

  m.on('success', () => {
    process.stdout.write('\x1B[2J\x1B[0f')
    console.log(`\n\n${results}`)
    console.log(
      `${okayLog}take it away ${chalk.yellow('`electron-builder`')}\n`,
    )
    process.exit()
  })

  pack(main)
    .then(result => {
      results += `${result}\n\n`
      m.success('main')
    })
    .catch(err => {
      m.error('main')
      console.log(`\n  ${errorLog}failed to build main process`)
      console.error(`\n${err}\n`)
      process.exit(1)
    })

  pack(renderer)
    .then(result => {
      results += `${result}\n\n`
      m.success('renderer')
    })
    .catch(err => {
      m.error('renderer')
      console.log(`\n  ${errorLog}failed to build renderer process`)
      console.error(`\n${err}\n`)
      process.exit(1)
    })
}

build()
