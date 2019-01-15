const td               = require('testdouble');
const expect           = require('../../helpers/expect');
const Promise          = require('rsvp').Promise;
const mockProject      = require('../../fixtures/corber-mock/project');
const isAnything       = td.matchers.anything();

describe('Init Command', () => {
  let CreateProject;
  let PlatformTask;
  let fsUtils;
  let getOS;
  let getVersions;

  let initCommand;
  let opts;
  let ui;

  beforeEach(() => {
    CreateProject = td.replace('../../../lib/tasks/create-project');
    td.when(CreateProject.prototype.run()).thenReturn(Promise.resolve());

    PlatformTask = td.replace('../../../lib/targets/cordova/tasks/platform')
    td.when(PlatformTask.prototype.run(), { ignoreExtraArgs: true })
      .thenReturn(Promise.resolve());

    fsUtils = td.replace('../../../lib/utils/fs-utils');
    td.when(fsUtils.existsSync('corber')).thenReturn(false);

    getOS = td.replace('../../../lib/utils/get-os');
    td.when(getOS()).thenReturn('linux');

    getVersions = td.replace('../../../lib/utils/get-versions');
    td.when(getVersions(), { ignoreExtraArgs: true }).thenReturn({
      corber: {
        project: {}
      }
    });

    td.replace('../../../lib/utils/logger');

    ui = td.object(['prompt']);
    td.when(ui.prompt(), { ignoreExtraArgs: true })
      .thenReturn(Promise.resolve());

    // hijack parent class; this is necessary because `getVersions` is used
    // by both the parent `Command` and the subclass `InitCommand`
    let Command = require('../../../lib/commands/-command').extend();
    td.replace('../../../lib/commands/-command', Command);

    let InitCommand = require('../../../lib/commands/init');

    initCommand = new InitCommand({
      project: mockProject.project,
      ui
    });

    opts = {
      cordovaId: 'cordovaId',
      name: 'cordovaName',
      templatePath: 'templatePath',
      platform: 'ios'
    };
  });

  afterEach(() => {
    td.reset();
  });

  it('sets cordovaId, name & templatePath on createproject', () => {
    return initCommand.run(opts).then(() => {
      td.verify(new CreateProject({
        project: isAnything,
        ui: isAnything,
        cordovaId: 'cordovaId',
        name: 'cordovaName',
        templatePath: 'templatePath'
      }));
    });
  });

  it('calls installPlatforms with --platform', () => {
    let installPlatforms = td.replace(initCommand, 'installPlatforms');

    return initCommand.run(opts).then(() => {
      td.verify(installPlatforms(['ios']), { ignoreExtraArgs: true });
    });
  });

  context('when --platform is not passed', () => {
    beforeEach(() => {
      opts.platform = undefined;
    });

    it('prompts then installs platforms', () => {
      td.when(ui.prompt(td.matchers.contains({ name: 'platforms' })))
        .thenReturn(Promise.resolve({ platforms: ['ios', 'android'] }));

      return initCommand.run(opts).then(() => {
        let platform = td.matchers.captor();

        td.config({ ignoreWarnings: true });
        td.verify(PlatformTask.prototype.run('add', platform.capture()), {
          ignoreExtraArgs: true
        });
        td.config({ ignoreWarnings: false });

        expect(platform.values).to.include('android');
        expect(platform.values).to.include('ios');
      });
    });

    it('does not call installPlatforms if selected platform is none', () => {
      td.when(ui.prompt(td.matchers.contains({ name: 'platforms' })))
        .thenReturn(Promise.resolve({ platforms: ['none'] }));

      return initCommand.run(opts).then(() => {
        td.config({ ignoreWarnings: true });

        td.verify(PlatformTask.prototype.run(), {
          ignoreExtraArgs: true,
          times: 0
        });

        td.config({ ignoreWarnings: false });
      });
    });
  });

  describe('validateAndRun', () => {
    it('throws exception when corber initialized', () => {
      td.when(getVersions(mockProject.project.root)).thenReturn({
        corber: {
          project: {
            required: '1.0.0'
          }
        }
      });

      return expect(() => initCommand.validateAndRun()).to.throw();
    });

    it('throws exception when project corber folder exists', () => {
      td.when(fsUtils.existsSync('corber')).thenReturn(true);
      return expect(() => initCommand.validateAndRun()).to.throw();
    });
  });

  describe('deserializePlatforms', () => {
    it('splits a single string', () => {
      let platforms = initCommand.deserializePlatforms('ios');
      expect(platforms).to.deep.equal(['ios']);
    });

    it('splits a multi string', () => {
      let platforms = initCommand.deserializePlatforms('ios,android');
      expect(platforms).to.deep.equal(['ios', 'android']);
    });
  });

  describe('buildPromptOptions', () => {
    context('is win32', () => {
      it('does not includes an ios option', () => {
        td.when(getOS()).thenReturn('win32');
        let promptOptions = initCommand.buildPromptOptions();
        expect(promptOptions.choices).to.not.contain('ios');
      });
    });

    context('is darwin', () => {
      it('includes an ios option', () => {
        td.when(getOS()).thenReturn('darwin');
        let promptOptions = initCommand.buildPromptOptions();
        expect(promptOptions.choices).to.contain('ios');
      });
    });
  });

  describe('installPlatforms', () => {
    it('installs each passed platform', () => {
      return initCommand.installPlatforms(['ios', 'android']).then(() => {
        let platform = td.matchers.captor();

        td.config({ ignoreWarnings: true });
        td.verify(PlatformTask.prototype.run('add', platform.capture()), {
          ignoreExtraArgs: true
        });
        td.config({ ignoreWarnings: false });

        expect(platform.values).to.include('android');
        expect(platform.values).to.include('ios');
      });
    });

    it('passes webview and save options to the platform task', () => {
      return initCommand.installPlatforms(['ios', 'android'], {
        uiwebview: false,
        crosswalk: true
      }).then(() => {
        let opts = td.matchers.captor();

        td.config({ ignoreWarnings: true });
        td.verify(
          PlatformTask.prototype.run('add', isAnything, opts.capture())
        );
        td.config({ ignoreWarnings: false });

        opts.values.forEach((capturedOpts) => {
          expect(capturedOpts).to.deep.equal({
            uiwebview: false,
            crosswalk: true,
            save: true
          });
        });
      });
    });
  });
});
