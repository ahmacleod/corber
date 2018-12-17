const td              = require('testdouble');
const Promise         = require('rsvp').Promise;
const expect          = require('../../../../helpers/expect');
const Device          = require('../../../../../lib/objects/device');

const adbPath    = 'adbPath';
const spawnArgs  = [adbPath, ['devices', '-l']];
const deviceList = `List of Devices Attached \nuuid  device usb:337641472X product:jfltevl model:SGH_I337M device:jfltecan transport_id:1 \n`;

describe('Android List Device Task', () => {
  let spawn;
  let listDevices;

  beforeEach(() => {
    let sdkPaths = td.replace('../../../../../lib/targets/android/utils/sdk-paths');
    td.when(sdkPaths()).thenReturn({ adb: adbPath });

    spawn = td.replace('../../../../../lib/utils/spawn');
    td.when(spawn(...spawnArgs))
      .thenReturn(Promise.resolve({ stdout: deviceList }));

    listDevices = require('../../../../../lib/targets/android/tasks/list-devices');
  });

  afterEach(() => {
    td.reset();
  });

  it('lints out emulators, ignoring non iOS devices', () => {
    return listDevices().then((found) => {
      expect(found).to.deep.equal([new Device({
        name: 'SGH_I337M',
        uuid: 'uuid',
        platform: 'android',
        deviceType: 'device'
      })]);
    });
  });
});
