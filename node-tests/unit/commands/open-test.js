const td            = require('testdouble');
const expect        = require('../../helpers/expect');
const Promise       = require('rsvp').Promise;

const mockProject   = require('../../fixtures/corber-mock/project');
const mockAnalytics = require('../../fixtures/corber-mock/analytics');

describe('Open Command', () => {
  let OpenAppTask;
  let logger;

  let open;
  let options;

  beforeEach(() => {
    OpenAppTask = td.replace('../../../lib/targets/cordova/tasks/open-app');
    logger = td.replace('../../../lib/utils/logger');

    td.when(OpenAppTask.prototype.run(), { ignoreExtraArgs: true })
      .thenReturn(Promise.resolve());

    let OpenCmd = require('../../../lib/commands/open');

    open = new OpenCmd({
      project: mockProject.project
    });

    open.analytics = mockAnalytics;

    options = {
      application: 'dummy',
      platform: 'ios'
    };
  });

  afterEach(() => {
    td.reset();
  });

  it('should resolve on completion', () => {
    return expect(open.run(options)).to.eventually.be.fulfilled;
  });

  it('logs an opening message', () => {
    return open.run(options).then(() => {
      td.verify(logger.info('Opening app for ios'));
    });
  });

  it('runs Open App Task', () => {
    return open.run(options).then(() => {
      td.config({ ignoreWarnings: true });
      td.verify(OpenAppTask.prototype.run());
      td.config({ ignoreWarnings: false });
    });
  });
});
