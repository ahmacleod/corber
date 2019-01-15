const td              = require('testdouble');
const expect          = require('../../helpers/expect');
const Promise         = require('rsvp').Promise;

const mockProject     = require('../../fixtures/corber-mock/project');
const mockAnalytics   = require('../../fixtures/corber-mock/analytics');

const isAnything      = td.matchers.anything();
const contains        = td.matchers.contains;

describe('Plugin Command', () => {
  let RawTask;
  let AddonArgs;
  let logger;

  let plugin;
  let opts;
  let rawArgs;

  beforeEach(() => {
    RawTask   = td.replace('../../../lib/targets/cordova/tasks/raw');
    AddonArgs = td.replace('../../../lib/targets/cordova/validators/addon-args')
    logger    = td.replace('../../../lib/utils/logger');

    td.when(AddonArgs.prototype.run())
      .thenReturn(Promise.resolve({
        action: 'add',
        name: ['cordova-plugin']
      }));

    td.when(RawTask.prototype.run(), { ignoreExtraArgs: true })
      .thenReturn(Promise.resolve());

    let PluginCommand = require('../../../lib/commands/plugin');

    plugin = new PluginCommand({
      project: mockProject.project
    });

    plugin.analytics = mockAnalytics;

    opts = {};
    rawArgs = ['add', 'cordova-plugin'];
  });

  afterEach(() => {
    td.reset();
  });

  it('passes args/vars to cordova arg sanitizer', () => {
    opts.variable = ['APP_ID=1234567890', 'APP_NAME=SomeApp']

    plugin.run(opts, ['add', 'cordova-plugin', 'another-plugin']).then(() => {
      td.config({ ignoreWarnings: true });
      td.verify(new AddonArgs({
        rawArgs: ['add', 'cordova-plugin', 'another-plugin'],
        varOpts: ['APP_ID=1234567890', 'APP_NAME=SomeApp'],
        api: 'plugin',
        multi: true
      }));
      td.config({ ignoreWarnings: false });
    });
  });

  it('creates plugin task with correct API', () => {
    return plugin.run(opts, rawArgs).then(() => {
      td.verify(new RawTask({
        project: mockProject.project,
        api: 'plugins'
      }));
    });
  });

  it('rejects with message if no plugins are specified', () => {
    td.when(AddonArgs.prototype.run())
      .thenReturn(Promise.resolve({
        action: 'add',
        name: []
      }));

    return expect(plugin.run(opts, ['add']))
      .to.eventually.be.rejectedWith(/no plugin specified/);
  });

  it('logs an error if no plugins are specified', () => {
    td.when(AddonArgs.prototype.run())
      .thenReturn(Promise.resolve({
        action: 'add',
        name: []
      }));

    return plugin.run(opts, ['add']).catch(() => {
      td.verify(logger.error('no plugin specified'));
    });
  });

  it('warns if trying to install multiple plugins at a time', () => {
    td.when(AddonArgs.prototype.run())
      .thenReturn(Promise.resolve({
        action: 'add',
        name: ['plugin-1', 'plugin-2']
      }));

      return plugin.run(opts, ['add', 'plugin-1', 'plugin-2']).then(() => {
      td.verify(logger.warn('only one plugin can be installed at a time'));
    });
  });

  it('passes command to Cordova Raw', () => {
    return plugin.run(opts, rawArgs).then(() => {
      td.config({ ignoreWarnings: true });
      td.verify(RawTask.prototype.run('add', 'cordova-plugin', isAnything));
      td.config({ ignoreWarnings: false });
    });
  });

  it('passes the save flag', () => {
    opts.save = false;
    let matcher = contains({ save: false });

    return plugin.run(opts, rawArgs).then(() => {
      td.config({ ignoreWarnings: true });
      td.verify(RawTask.prototype.run('add', 'cordova-plugin', matcher));
      td.config({ ignoreWarnings: false });
    });
  });

  it('passes the searchpath flag', () => {
    opts.searchpath = '/var';
    let matcher = contains({ searchpath: '/var' });

    return plugin.run(opts, rawArgs).then(() => {
      td.config({ ignoreWarnings: true });
      td.verify(RawTask.prototype.run('add', 'cordova-plugin', matcher));
      td.config({ ignoreWarnings: false });
    });
  });

  it('passes the noregistry flag', () => {
    opts.noregistry = true;
    let matcher = contains({ noregistry: true });

    return plugin.run(opts, rawArgs).then(() => {
      td.config({ ignoreWarnings: true });
      td.verify(RawTask.prototype.run('add', 'cordova-plugin', matcher));
      td.config({ ignoreWarnings: false });
    });
  });

  it('passes the nohooks flag', () => {
    opts.nohooks = true;
    let matcher = contains({ nohooks: true });

    return plugin.run(opts, rawArgs).then(() => {
      td.config({ ignoreWarnings: true });
      td.verify(RawTask.prototype.run('add', 'cordova-plugin', matcher));
      td.config({ ignoreWarnings: false });
    });
  });

  it('passes the browserify flag', () => {
    opts.browserify = true;
    let matcher = contains({ browserify: true });

    return plugin.run(opts, rawArgs).then(() => {
      td.config({ ignoreWarnings: true });
      td.verify(RawTask.prototype.run('add', 'cordova-plugin', matcher));
      td.config({ ignoreWarnings: false });
    });
  });

  it('passes the link flag', () => {
    opts.link = true;
    let matcher = contains({ link: true });

    return plugin.run(opts, rawArgs).then(() => {
      td.config({ ignoreWarnings: true });
      td.verify(RawTask.prototype.run('add', 'cordova-plugin', matcher));
      td.config({ ignoreWarnings: false });
    });
  });

  it('passes the noregistry flag', () => {
    opts.force = true;
    let matcher = contains({ force: true })

    return plugin.run(opts, rawArgs).then(() => {
      td.config({ ignoreWarnings: true });
      td.verify(RawTask.prototype.run('add', 'cordova-plugin', matcher));
      td.config({ ignoreWarnings: false });
    });
  });

  it('defaults fetch to true', () => {
    let matcher = contains({ fetch: true });

    return plugin.run(opts, rawArgs).then(() => {
      td.config({ ignoreWarnings: true });
      td.verify(RawTask.prototype.run('add', 'cordova-plugin', matcher));
      td.config({ ignoreWarnings: false });
    });
  });

  context('when plugin task fails', () => {
    beforeEach(() => {
      td.when(RawTask.prototype.run(), { ignoreExtraArgs: true })
        .thenReturn(Promise.reject('plugin task error'));
    });

    it('logs the error', () => {
      return plugin.run(opts, rawArgs).catch(() => {
        td.verify(logger.error('plugin task error'));
      });
    });

    it('rejects with same error', () => {
      return expect(plugin.run(opts, rawArgs))
        .to.eventually.be.rejectedWith(/plugin task error/);
    });
  });

  context('when adding a plugin', () => {
    it('logs action to info', () => {
      return plugin.run(opts, rawArgs).then(() => {
        td.verify(logger.info('Adding plugin cordova-plugin'));
      });
    });

    it('logs success on completion', () => {
      return plugin.run(opts, rawArgs).then(() => {
        td.verify(logger.success('Added plugin cordova-plugin'));
      });
    });
  });

  context('when removing a plugin', () => {
    beforeEach(() => {
      td.when(AddonArgs.prototype.run())
        .thenReturn(Promise.resolve({
          action: 'remove',
          name: ['cordova-plugin']
        }));
    });

    it('logs action to info', () => {
      return plugin.run(opts, rawArgs).then(() => {
        td.verify(logger.info('Removing plugin cordova-plugin'));
      });
    });

    it('logs success on completion', () => {
      return plugin.run(opts, rawArgs).then(() => {
        td.verify(logger.success('Removed plugin cordova-plugin'));
      });
    });
  });
});
