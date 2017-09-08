 /* eslint-disable max-len */
var td              = require('testdouble');
var mockProject     = require('../../../../fixtures/corber-mock/project');
var CdvRawTask      = require('../../../../../lib/targets/cordova/tasks/raw');
 /* eslint-enable max-len */

var setupBuildTask = function() {
  var CdvBuildTask = require('../../../../../lib/targets/cordova/tasks/build');
  return new CdvBuildTask(mockProject);
};

describe('Cordova Build Task', function() {
  afterEach(function() {
    td.reset();
  });

  it('creates a raw build task', function() {
    var cdvBuild = td.replace(CdvRawTask.prototype, 'run');
    var build = setupBuildTask();
    build.platform = 'ios';
    build.run();

    td.verify(cdvBuild({platforms: ['ios'], options: {}, verbose: false}));
  });

  it('sets platform to android', function() {
    var cdvBuild = td.replace(CdvRawTask.prototype, 'run');
    var build = setupBuildTask();
    build.platform = 'android';
    build.run();

    td.verify(cdvBuild({platforms: ['android'], options: {}, verbose: false}));
  });
});
