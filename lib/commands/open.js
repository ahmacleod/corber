const Command          = require('./-command');
const OpenAppTask      = require('../targets/cordova/tasks/open-app');
const logger           = require('../utils/logger');

module.exports = Command.extend({
  name: 'open',
  aliases: [ 'o' ],
  description: 'Open the native platform project with the default or ' +
    'specified application',

  availableOptions: [
    { name: 'platform', type: String, default: 'ios' },
    { name: 'application', type: String }
  ],

  run(options) {
    this._super(...arguments);

    logger.info(`Opening app for ${options.platform}`);

    let openAppTask = new OpenAppTask({
      application: options.application,
      platform: options.platform,
      project: this.project
    });

    return openAppTask.run()
      .catch((e) => {
        logger.error(e);
        throw e;
      });
  }
});
