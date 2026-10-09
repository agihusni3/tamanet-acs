import { HiosoDriver } from './hioso-driver';
import { Olt, PonType } from '../olt/olt.entity';

describe('HiosoDriver', () => {
  const createOlt = (model: string, ponPortsCount?: number): Olt => {
    const olt = new Olt();
    olt.id = 'test-hioso-1';
    olt.name = `OLT-${model}`;
    olt.vendor = 'Hioso';
    olt.model = model;
    olt.ip = '192.168.10.2';
    olt.cliPort = 23;
    olt.webPort = 80;
    olt.ponType = PonType.EPON;
    if (ponPortsCount) olt.ponPortsCount = ponPortsCount;
    return olt;
  };

  it('harus mengonfigurasi 2 Port PON untuk model HA7302CST', async () => {
    const driver = new HiosoDriver(createOlt('HA7302CST'));
    const ports = await driver.listPonPorts();

    expect(ports.length).toBe(2);
    expect(ports[0].label).toBe('EPON0/1');
    expect(ports[1].label).toBe('EPON0/2');
  });

  it('harus mengonfigurasi 2 Port PON untuk model 2P1G', async () => {
    const driver = new HiosoDriver(createOlt('2P1G'));
    const ports = await driver.listPonPorts();

    expect(ports.length).toBe(2);
    expect(ports[0].label).toBe('EPON0/1');
    expect(ports[1].label).toBe('EPON0/2');
  });

  it('harus mengonfigurasi 4 Port PON untuk model HA7304', async () => {
    const driver = new HiosoDriver(createOlt('HA7304'));
    const ports = await driver.listPonPorts();

    expect(ports.length).toBe(4);
    expect(ports[0].label).toBe('EPON0/1');
    expect(ports[1].label).toBe('EPON0/2');
    expect(ports[2].label).toBe('EPON0/3');
    expect(ports[3].label).toBe('EPON0/4');
  });

  it('harus memprioritaskan ponPortsCount jika secara eksplisit diset pada entitas', async () => {
    const driver = new HiosoDriver(createOlt('HA7304', 2));
    const ports = await driver.listPonPorts();

    expect(ports.length).toBe(2);
  });
});
