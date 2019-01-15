const Command            = require('./-command');
const AddonArgsValidator = require('../targets/cordova/validators/addon-args');
const PlatformTask       = require('../targets/cordova/tasks/platform');
const HookTask           = require('../tasks/run-hook');
const logger             = require('../utils/logger');
const camelize           = require('../utils/string').camelize;

module.exports = Command.extend({
  name: 'platform',
  aliases: [ 'pl' ],
  description: 'Add/remove platforms',

  availableOptions: [
    { name: 'save',                 type: Boolean,  default: true },
    { name: 'crosswalk',            type: Boolean,  default: false },
    { name: 'uiwebview',            type: Boolean,  default: false },
    { name: 'link',                 type: String,   default: undefined }
  ],

  run(options, rawArgs) {
    this._super(...arguments);

    let addonArgsValidator = new AddonArgsValidator({
      rawArgs: rawArgs,
      api: 'platform'
    });

    let platformTask = new PlatformTask({
      project: this.project
    });

    let hookTask = new HookTask({
      project: this.project
    });

    let platform, action;

    return addonArgsValidator.run().then((validated) => {
      action = validated.action;
      platform = validated.name;

      let hookName = camelize(`beforePlatform-${action}`);
      return hookTask.run(hookName, options);
    })
    .then(() => {
      let verb = action === 'add' ? 'Adding' : 'Removing';
      logger.info(`${verb} platform ${platform}`);
      return platformTask.run(action, platform, options);
    })
    .then(() => {
      let hookName = camelize(`afterPlatform-${action}`);
      return hookTask.run(hookName, options);
    })
    .then(() => {
      let verb = action === 'add' ? 'Added' : 'Removed';
      logger.success(`${verb} platform ${platform}`);
    })
    .catch((e) => {
      logger.error(e);
      throw e;
    });
  }
});
