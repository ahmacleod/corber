const td              = require('testdouble');
const expect          = require('../../helpers/expect');
const Promise         = require('rsvp');
const cloneDeep       = require('lodash').cloneDeep;

const mockProject     = require('../../fixtures/corber-mock/project');
const mockAnalytics   = require('../../fixtures/corber-mock/analytics');

describe('Serve Command', () => {
  let editXML;
  let HookTask;
  let CreateLRShellTask;
  let requireFramework;
  let requireTarget;
  let logger;

  let mockFramework;
  let mockTarget;

  let serve;
  let project;
  let opts;

  let setupTaskTracking = (tasks) => {
    let stubTask = (id, returnValue) => {
      return (...args) => {
        let label = typeof (id) === 'function' ? id(...args) : id;
        tasks.push(label);
        return Promise.resolve(returnValue);
      }
    };

    td.replace(editXML, 'addNavigation', stubTask('add-navigation'));
    td.replace(editXML, 'removeNavigation', stubTask('remove-navigation'));
    td.replace(HookTask.prototype, 'run', stubTask((name) => `hook ${name}`));
    td.replace(CreateLRShellTask.prototype, 'run', stubTask('create-livereload-shell'));
    td.replace(mockFramework, 'validateServe', stubTask('framework-validate-serve'));
    td.replace(mockFramework, 'serve', stubTask('framework-serve'));
    td.replace(mockTarget, 'validateServe', stubTask('cordova-validate-serve'));
    td.replace(mockTarget, 'build', stubTask('cordova-build'));
  };

  beforeEach(() => {
    let getNetworkIp;

    editXML           = td.replace('../../../lib/targets/cordova/utils/edit-xml');
    HookTask          = td.replace('../../../lib/tasks/run-hook');
    CreateLRShellTask = td.replace('../../../lib/tasks/create-livereload-shell');
    requireFramework  = td.replace('../../../lib/utils/require-framework');
    requireTarget     = td.replace('../../../lib/utils/require-target');
    getNetworkIp      = td.replace('../../../lib/utils/get-network-ip');
    logger            = td.replace('../../../lib/utils/logger');

    mockFramework     = td.object(['validateServe', 'serve']);
    mockTarget        = td.object(['validateServe', 'build']);

    project = cloneDeep(mockProject.project);
    project.config = () => ({ locationType: 'hash' });

    td.when(editXML.addNavigation(), { ignoreExtraArgs: true })
      .thenReturn(Promise.resolve());

    td.when(requireFramework(project)).thenReturn(mockFramework);

    td.when(requireTarget(project), { ignoreExtraArgs: true })
      .thenReturn(mockTarget);

    td.when(getNetworkIp()).thenReturn('192.168.0.1');

    let ServeCommand = require('../../../lib/commands/serve');

    serve = new ServeCommand({
      project
    });

    serve.analytics = mockAnalytics;

    opts = { platform: 'ios' };
  });

  afterEach(() => {
    td.reset();
  });

  it('to resolve on completion', () => {
    return expect(serve.run(opts)).to.eventually.be.fulfilled;
  });

  it('advertises the start command', () => {
    return serve.run(opts).then(() => {
      td.verify(logger.info(td.matchers.contains('corber start')));
    });
  });

  it('sets vars for webpack livereload', () => {
    return serve.run(opts).then(() => {
      expect(project.CORBER_PLATFORM).to.equal('ios');
    });
  });

  it('sets process.env.CORBER_PLATFORM & CORBER_LIVERELOAD', () => {
    return serve.run(opts).then(() => {
      expect(process.env.CORBER_PLATFORM).to.equal('ios');
      expect(process.env.CORBER_LIVERELOAD).to.equal('true');
    });
  });

  it('runs tasks in the correct order', () => {
    let tasks = [];
    setupTaskTracking(tasks);

    return serve.run(opts).then(() => {
      expect(tasks).to.deep.equal([
        'add-navigation',
        'hook beforeBuild',
        'cordova-validate-serve',
        'framework-validate-serve',
        'create-livereload-shell',
        'cordova-build',
        'hook afterBuild',
        'framework-serve',
        'remove-navigation'
      ]);
    });
  });

  it('skips cordova builds with --skip-cordova-build flag', () => {
    let tasks = [];
    setupTaskTracking(tasks);

    opts.skipCordovaBuild = true;

    return serve.run(opts).then(() => {
      expect(tasks).to.deep.equal([
        'add-navigation',
        'hook beforeBuild',
        'cordova-validate-serve',
        'framework-validate-serve',
        'create-livereload-shell',
        'hook afterBuild',
        'framework-serve',
        'remove-navigation'
      ]);
    });
  });

  it('skips framework serve with --skip-framework-serve flag', () => {
    let tasks = [];
    setupTaskTracking(tasks);

    opts.skipFrameworkServe = true;

    return serve.run(opts).then(() => {
      expect(tasks).to.deep.equal([
        'add-navigation',
        'hook beforeBuild',
        'cordova-validate-serve',
        'framework-validate-serve',
        'create-livereload-shell',
        'cordova-build',
        'hook afterBuild',
        'remove-navigation'
      ]);
    });
  });

  it('logs to info on serve', () => {
    let getReloadUrl = td.replace(serve, 'getReloadUrl', td.function());
    td.when(getReloadUrl(), { ignoreExtraArgs: true }).thenReturn('url');

    return serve.run(opts).then(() => {
      td.verify(logger.info(`Serving on url`));
    });
  });
});
