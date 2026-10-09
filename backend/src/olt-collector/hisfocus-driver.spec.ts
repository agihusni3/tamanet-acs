import { HisfocusDriver } from './hisfocus-driver';
import { Olt, PonType } from '../olt/olt.entity';
import { OltCollectorService } from './olt-collector.service';
import { Repository } from 'typeorm';

describe('HisfocusDriver & Hisfocus 2 PON Compatibility', () => {
  const createHisfocusOlt = (model = 'HSGQ-E02', ponType = PonType.EPON, ponPortsCount = 2): Olt => {
    const olt = new Olt();
    olt.id = 'test-hisfocus-1';
    olt.name = `OLT-${model}`;
    olt.vendor = 'Hisfocus';
    olt.model = model;
    olt.ip = '192.168.1.100';
    olt.cliPort = 23;
    olt.webPort = 80;
    olt.ponType = ponType;
    olt.ponPortsCount = ponPortsCount;
    return olt;
  };

  it('harus mengonfigurasi 2 Port PON (EPON0/1 & EPON0/2) untuk Hisfocus 2 PON EPON (HSGQ-E02)', async () => {
    const driver = new HisfocusDriver(createHisfocusOlt('HSGQ-E02', PonType.EPON, 2));
    const ports = await driver.listPonPorts();

    expect(ports.length).toBe(2);
    expect(ports[0].slot).toBe(0);
    expect(ports[0].port).toBe(1);
    expect(ports[0].label).toBe('EPON0/1');
    expect(ports[1].slot).toBe(0);
    expect(ports[1].port).toBe(2);
    expect(ports[1].label).toBe('EPON0/2');
  });

  it('harus mengonfigurasi 2 Port PON (GPON0/1 & GPON0/2) jika tipe PON adalah GPON', async () => {
    const driver = new HisfocusDriver(createHisfocusOlt('HSGQ-G02', PonType.GPON, 2));
    const ports = await driver.listPonPorts();

    expect(ports.length).toBe(2);
    expect(ports[0].label).toBe('GPON0/1');
    expect(ports[1].label).toBe('GPON0/2');
  });

  it('harus memilih HisfocusDriver saat vendor atau model adalah Hisfocus / HSGQ / hisfous', () => {
    const collector = new OltCollectorService(
      {} as Repository<Olt>,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    // Vendor Hisfocus
    const olt1 = createHisfocusOlt('HSGQ-E02');
    const driver1 = collector.getDriver(olt1);
    expect(driver1).toBeInstanceOf(HisfocusDriver);

    // Vendor dengan typo 'hisfous' seperti permintaan user
    const oltTypo = createHisfocusOlt('2 PON');
    oltTypo.vendor = 'hisfous';
    const driverTypo = collector.getDriver(oltTypo);
    expect(driverTypo).toBeInstanceOf(HisfocusDriver);

    // Vendor HSGQ
    const oltHsgq = createHisfocusOlt('HSGQ-E02');
    oltHsgq.vendor = 'HSGQ';
    const driverHsgq = collector.getDriver(oltHsgq);
    expect(driverHsgq).toBeInstanceOf(HisfocusDriver);
  });
});
