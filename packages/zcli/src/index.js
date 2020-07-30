// COPIED FROM https://github.com/adobe/aio-cli/blob/master/src/index.js
// NOTE: All this file does is help up support commands seperated by spaces.
// by default oclif supports commands seperated by : ie `zcli apps:create`

const { Command, run } = require('@oclif/command')
const Config = require('@oclif/config')

class ZCLICommand extends Command { }

ZCLICommand.run = async (argv, opts) => {
  if (!argv) {
    argv = process.argv.slice(2)
  }

  // oclif originally included the following too ...
  // this resulted in an uncovered line in the tests, and it appeared to never happen anyway
  // seem like it would only
  // ||  module.parent && module.parent.parent && module.parent.parent.filename
  const config = await Config.load(opts || __dirname)

  let subCommand = argv[0]

  // 1. find the first flag ( note: there could be none ... )
  let firstFlag = argv.slice().findIndex((elem) => elem.indexOf('-') === 0)
  if (firstFlag < 0) {
    firstFlag = argv.length
  }
  // 2. try to make the biggest topic command by combining with ':'
  // and looking up in this.config.commandIDs
  for (let x = firstFlag; x > -1; x--) {
    subCommand = argv.slice(0, x).join(':')
    // if (config.findTopic(subCommand)) { // <= this works but does not support aliases
    if (config.findCommand(subCommand)) {
      argv = [subCommand].concat(argv.slice(x))
      break
    }
  }

  // the second parameter is the root path to the CLI containing the command
  return run(argv, config.options)
}

module.exports = ZCLICommand
