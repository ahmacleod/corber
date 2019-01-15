const td             = require('testdouble');
const expect         = require('../../helpers/expect');
const Promise        = require('rsvp');
const mockProject    = require('../../fixtures/corber-mock/project');
const mockAnalytics  = require('../../fixtures/corber-mock/analytics');
const path           = require('path');
const lodash         = require('lodash');

describe('Build Command', () => {
  let AddCordovaJS;
  let LintTask;

  let build;
  let opts

  let tasks;
  let stubTask = (id, returnValue) => {
    return (...args) => {
      let label = typeof (id) === 'function' ? id(...args) : id;
      tasks.push(label);
      return Promise.resolve(returnValue);
    }
  };

  beforeEach(() => {
    tasks = [];

    let project = lodash.cloneDeep(mockProject.project);
    project.config = () => {
      return {
        locationType: 'hash'
      };
    };

    let HookTask = td.replace('../../../lib/tasks/run-hook');
    HookTask.prototype.run = stubTask((name) => `hook ${name}`);

    LintTask = td.replace('../../../lib/tasks/lint-index');
    LintTask.prototype.run = stubTask('lint-index');

    AddCordovaJS = td.replace('../../../lib/tasks/add-cordova-js');
    AddCordovaJS.prototype.run = stubTask('add-cordova-js');

    td.replace('../../../lib/utils/logger');

    let requireTarget = td.replace('../../../lib/utils/require-target');
    td.when(requireTarget(project), { ignoreExtraArgs: true }).thenReturn({
      validateBuild: stubTask('cordova-target-validate-build'),
      build: stubTask('cordova-target-build')
    });

    let requireFramework = td.replace('../../../lib/utils/require-framework');
    td.when(requireFramework(project)).thenReturn({
      validateBuild: stubTask('framework-validate-build'),
      build: stubTask('framework-build')
    });

    let BuildCmd = require('../../../lib/commands/build');
    build = new BuildCmd({
      project
    });

    build.analytics = mockAnalytics;

    opts = {
      cordovaOutputPath: 'corber/cordova/www',
      platform: 'ios'
    };
  });

  afterEach(() => {
    td.reset();
  });

  it('exits cleanly', () => {
    return expect(build.run(opts)).to.eventually.be.fulfilled;
  });

  it('runs tasks in the correct order', () => {
    return build.run(opts).then(() => {
      //h-t ember-electron for the pattern
      expect(tasks).to.deep.equal([
        'hook beforeBuild',
        'framework-validate-build',
        'cordova-target-validate-build',
        'framework-build',
        'add-cordova-js',
        'cordova-target-build',
        'hook afterBuild',
        'lint-index'
      ]);
    });
  });

  it('skips ember-build with the --skip-ember-build flag', () => {
    opts.skipFrameworkBuild = true;

    return build.run(opts)
    .then(() => {
      //h-t ember-electron for the pattern
      expect(tasks).to.deep.equal([
        'hook beforeBuild',
        'framework-validate-build',
        'cordova-target-validate-build',
        'cordova-target-build',
        'hook afterBuild',
        'lint-index'
      ]);
    });
  });

  it('adds cordova-js with --add-cordova-js --skip-framework-build flags', () => {
    opts.skipFrameworkBuild = true;
    opts.addCordovaJs = true;

    return build.run(opts).then(() => {
      //h-t ember-electron for the pattern
      expect(tasks).to.deep.equal([
        'hook beforeBuild',
        'framework-validate-build',
        'cordova-target-validate-build',
        'add-cordova-js',
        'cordova-target-build',
        'hook afterBuild',
        'lint-index'
      ]);
    });
  });

  it('skips cordova-build with the --skip-cordova-build flag', () => {
    opts.skipCordovaBuild = true;

    return build.run(opts)
    .then(() => {
      //h-t ember-electron for the pattern
      expect(tasks).to.deep.equal([
        'hook beforeBuild',
        'framework-validate-build',
        'cordova-target-validate-build',
        'framework-build',
        'add-cordova-js',
        'hook afterBuild',
        'lint-index'
      ]);
    });
  });

  it('constructs AddCordovaJS as expected', () => {
    return build.run(opts).then(() => {
      td.verify(new AddCordovaJS({
        source: path.join('corber', 'cordova', 'www', 'index.html')
      }));
    });
  });

  it('constructs lint index as expected', () => {
    return build.run(opts).then(() => {
      td.verify(new LintTask({
        source: path.join('corber', 'cordova', 'www', 'index.html')
      }));
    });
  });

  it('supports custom output path with --cordova-output-path option', () => {
    opts.cordovaOutputPath = 'foo';

    return build.run(opts).then(() => {
      td.verify(new AddCordovaJS({
        source: path.join('foo', 'index.html')
      }));
      td.verify(new LintTask({
        source: path.join('foo', 'index.html')
      }));
    });
  });

  it('sets process.env.CORBER_PLATFORM', () => {
    return build.run(opts).then(() => {
      expect(process.env.CORBER_PLATFORM).to.equal('ios');
    });
  });
});
