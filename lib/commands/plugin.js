const Command          = require('./-command');
const RawTask          = require('../targets/cordova/tasks/raw');
const SanitizeArgs     = require('../targets/cordova/validators/addon-args');
const logger           = require('../utils/logger');

module.exports = Command.extend({
  name: 'plugin',
  aliases: [ 'p' ],
  description: 'Add/remove a plugin',

  availableOptions: [
    { name: 'save',            type: Boolean, default: true },
    { name: 'variable',        type: Array,                  aliases: ['var'] },
    { name: 'searchpath',      type: String },
    { name: 'noregistry',      type: Boolean, default: false },
    { name: 'nohooks',         type: Boolean, default: false },
    { name: 'browserify',      type: Boolean, default: false },
    { name: 'link',            type: Boolean, default: false },
    { name: 'force',           type: Boolean, default: false }
  ],

  run(options = {}, rawArgs = []) {
    this._super(...arguments);

    let cordovaArgSanitizer = new SanitizeArgs({
      rawArgs: rawArgs,
      varOpts: options.variable,
      api: 'plugin',
      multi: true
    });

    let pluginTask = new RawTask({
      project: this.project,
      api: 'plugins'
    });

    let action, plugin;

    return cordovaArgSanitizer.run().then((validated) => {
      action = validated.action;
      plugin = validated.name[0];

      if (validated.name.length === 0) {
        throw new Error('no plugin specified');
      }

      if (validated.name.length > 1) {
        logger.warn('only one plugin can be installed at a time');
      }

      let verb = action === 'add' ? 'Adding' : 'Removing';
      logger.info(`${verb} plugin ${plugin}`);

      let taskOptions = {
        save: options.save,
        searchpath: options.searchpath,
        noregistry: options.noregistry,
        nohooks: options.nohooks,
        browserify: options.browserify,
        link: options.link,
        force: options.force,
        cli_variables: validated.varOpts, // eslint-disable-line camelcase
        fetch: true
      };

      return pluginTask.run(action, plugin, taskOptions);
    }).then(() => {
      let verb = action === 'add' ? 'Added' : 'Removed';
      logger.success(`${verb} plugin ${plugin}`);
    }).catch((e) => {
      logger.error(e.message ? e.message : e);
      throw e;
    });
  }
});
