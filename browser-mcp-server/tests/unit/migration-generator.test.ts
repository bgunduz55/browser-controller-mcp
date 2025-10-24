/**
 * Migration Generator Unit Tests
 */

import { MigrationGenerator } from '../../src/migration/generator';
import { Filter, MigrationConfig } from '../../src/types';

describe('MigrationGenerator', () => {
  let generator: MigrationGenerator;

  beforeEach(() => {
    generator = new MigrationGenerator();
  });

  test('should generate migration for NUMBER type filter', () => {
    const filters: Filter[] = [
      {
        name: 'fiyat',
        label: 'Fiyat',
        type: 'NUMBER',
        selector: '#price',
        rules: {
          min: 0,
          max: 999999,
          isRequired: false,
          isUnique: false
        }
      }
    ];

    const config: MigrationConfig = {
      startId: 1,
      categoryId: 1,
      noticeTypes: ['SELL', 'BUY', 'SWAP']
    };

    const result = generator.generateMigration(filters, config);

    expect(result.propertyCount).toBe(3); // SELL, BUY, SWAP
    expect(result.mappingCount).toBe(1); // One mapping for NUMBER type
    expect(result.nextId).toBe(5); // 1 + 4 properties (SELL + BUY Min + BUY Max + SWAP)
    expect(result.sql).toContain('fiyat');
    expect(result.sql).toContain('fiyatMin');
    expect(result.sql).toContain('fiyatMax');
  });

  test('should generate migration for ENUM type filter', () => {
    const filters: Filter[] = [
      {
        name: 'yakit_tipi',
        label: 'Yakıt Tipi',
        type: 'ENUM',
        selector: '#fuel-type',
        values: ['Benzin', 'Dizel', 'LPG'],
        rules: {
          enumValues: ['Benzin', 'Dizel', 'LPG'],
          isRequired: false,
          isUnique: false
        }
      }
    ];

    const config: MigrationConfig = {
      startId: 1,
      categoryId: 1,
      noticeTypes: ['SELL', 'BUY', 'SWAP']
    };

    const result = generator.generateMigration(filters, config);

    expect(result.propertyCount).toBe(3); // SELL, BUY, SWAP
    expect(result.mappingCount).toBe(1); // One mapping for ENUM type
    expect(result.sql).toContain('yakit_tipi');
    expect(result.sql).toContain('Benzin');
  });
});
