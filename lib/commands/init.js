const Command         = require('./-command');
const CreateProject   = require('../tasks/create-project');
const PlatformTask    = require('../targets/cordova/tasks/platform');
const logger          = require('../utils/logger');
const fsUtils         = require('../utils/fs-utils');
const getOS           = require('../utils/get-os');
const getVersions     = require('../utils/get-versions');
const chalk           = require('chalk');
const RSVP            = require('rsvp');
const lodash          = require('lodash');
const _get            = lodash.get;
const _pick           = lodash.pick;

module.exports = Command.extend({
  name: 'init',
  aliases: ['i'],

  // init has special scope handling in `validateAndRun`
  scope: 'everywhere',

  availableOptions: [
    { name: 'name',                 type: String },
    { name: 'cordovaid',            type: String },
    { name: 'template-path',        type: String },
    { name: 'platform',             type: String },
    { name: 'crosswalk',            type: Boolean,  default: false },
    { name: 'uiwebview',            type: Boolean,  default: false }
  ],

  validateAndRun() {
    let versions = getVersions(this.project.root);
    let version = _get(versions, 'corber.project.required');

    if (version !== undefined) {
      throw `You cannot use ${chalk.green('corber init')} if corber is ` +
        'already present in your project\'s package.json';
    }

    if (fsUtils.existsSync('corber')) {
      throw `You cannot use ${chalk.green('corber init')} if your project ` +
        'already contains a corber folder';
    }

    return this._super(...arguments);
  },

  run(opts) {
    this._super(...arguments);

    let create = new CreateProject({
      project: this.project,
      ui: this.ui,
      cordovaId: opts.cordovaId,
      name: opts.name,
      templatePath: opts.templatePath
    });

    return create.run().then(() => {
      if (opts.platform) {
        return this.deserializePlatforms(opts.platform);
      }

      return this.promptForPlatforms();
    })
    .then((platforms) => {
      if (platforms.length === 0) {
        logger.warn('No platforms selected');
        return;
      }

      return this.installPlatforms(platforms, opts);
    })
    .then(() => logger.success('Project created'))
    .catch((err) => {
      logger.error(err);
      throw err;
    });
  },

  deserializePlatforms(platformStr) {
    return platformStr.split(',');
  },

  promptForPlatforms() {
    let promptOpts = this.buildPromptOptions();

    return this.ui.prompt(promptOpts).then((selected) => {
      let { platforms } = selected;

      if (platforms.length === 0 || platforms[0] === 'none') {
        return [];
      }

      return platforms;
    });
  },

  buildPromptOptions() {
    let platform = getOS();
    let promptOpts = {
      type: 'checkbox',
      name: 'platforms',
      message: 'Which platforms should we init with?',
      choices: [
        'none',
        'android'
      ]
    };

    if (platform === 'darwin') {
      promptOpts['choices'].push('ios');
    }

    return promptOpts;
  },

  installPlatforms(platforms, options) {
    let installs = [];
    let installOpts = _pick(options, 'crosswalk', 'uiwebview');
    installOpts.save = true;

    let addPlatform = new PlatformTask({ project: this.project });

    platforms.forEach((platform) => {
      logger.info(`Installing ${platform}`);
      installs.push(addPlatform.run('add', platform, installOpts));
    });

    return RSVP.allSettled(installs);
  }
});
