const Task             = require('../../../tasks/-task');
const Promise          = require('rsvp').Promise;
const _pullAll         = require('lodash').pullAll;
const _intersection    = require('lodash').intersection;

const addCmds = ['add', 'a'];
const rmCmds = ['remove', 'rm', 'r'];

/*
 For a given platform/plugin command, return a hash with:
   {
     action: add or remove,
     name: name of platform/plugin, e.g. ios,
     varOpts: formatted plugin vars to cordova standards
   }
*/

module.exports = Task.extend({
  rawArgs: undefined,
  api: undefined,
  varOpts: undefined,

  //cordova commands are long strings - we need to manually see if it is add/rm
  getAction(rawArgs) {
    if (_intersection(rawArgs, addCmds).length > 0) {
      return 'add';
    } else if (_intersection(rawArgs, rmCmds).length > 0) {
      return 'remove'
    }
  },

  //rm add/remove text from arguments
  getTargetName(rawArgs, opts = {}) {
    let availableActions = addCmds.concat(rmCmds);
    _pullAll(rawArgs, availableActions);
    return opts.multi ? rawArgs : rawArgs[0];
  },

  /*
    Vars are passed from ember-cli as 'VAR_NAME=VALUE'
    Cordova requires { VAR_NAME: 'VALUE' }
  */
  hashifyVars(opts) {
    if (opts === undefined) { return {} }

    let hashedOpts = {};
    opts.forEach(function(s) {
      let eq = s.indexOf('=');
      let key = s.substr(0, eq).toUpperCase();
      let val = s.substr(eq + 1, s.length);
      hashedOpts[key] = val;
    });

    return hashedOpts;
  },

  run() {
    let action, targetName, sanitized;

    action = this.getAction(this.rawArgs);
    if (!action) {
      let cmd = `corber ${this.api} add ios`;
      return Promise.reject('Missing add/rm flag, e.g. ' + cmd);
    }

    //Cooerce rawArgs/Opts to cordova spec
    targetName = this.getTargetName(this.rawArgs, { multi: this.multi });
    let hashedOpts = this.hashifyVars(this.varOpts);

    sanitized = {
      action: action,
      name: targetName,
      varOpts: hashedOpts
    };

    return Promise.resolve(sanitized);
  }
});
