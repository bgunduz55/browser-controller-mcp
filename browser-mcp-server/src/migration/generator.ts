/**
 * Migration Generator
 * Generates SQL migration files from extracted filters
 */

import { Filter, FilterType, MigrationConfig } from '../types';

export interface MigrationResult {
  sql: string;
  propertyCount: number;
  mappingCount: number;
  nextId: number;
}

export class MigrationGenerator {
  generateMigration(filters: Filter[], config: MigrationConfig): MigrationResult {
    let currentId = config.startId;
    const sqlStatements: string[] = [];
    const mappings: string[] = [];

    // Header
    sqlStatements.push(this.generateHeader(config.categoryId));

    // Process each filter
    for (const filter of filters) {
      // SELL property
      const sellId = currentId++;
      sqlStatements.push(
        this.generatePropertyInsert(sellId, filter, config.categoryId, 'SELL')
      );

      // BUY properties
      if (filter.type === 'NUMBER') {
        // Min property
        const buyMinId = currentId++;
        sqlStatements.push(
          this.generatePropertyInsert(
            buyMinId,
            { ...filter, name: `${filter.name}Min` },
            config.categoryId,
            'BUY'
          )
        );

        // Max property
        const buyMaxId = currentId++;
        sqlStatements.push(
          this.generatePropertyInsert(
            buyMaxId,
            { ...filter, name: `${filter.name}Max` },
            config.categoryId,
            'BUY'
          )
        );

        // Mapping
        mappings.push(
          this.generateMapping(sellId, buyMinId, buyMaxId, config.categoryId, 'RANGE_MATCH')
        );
      } else {
        // Single BUY property
        const buyId = currentId++;
        sqlStatements.push(
          this.generatePropertyInsert(buyId, filter, config.categoryId, 'BUY')
        );

        // Mapping
        mappings.push(
          this.generateMapping(sellId, buyId, null, config.categoryId, 'EXACT_MATCH')
        );
      }

      // SWAP property
      const swapId = currentId++;
      sqlStatements.push(
        this.generatePropertyInsert(swapId, filter, config.categoryId, 'SWAP')
      );
    }

    // Add mappings
    if (mappings.length > 0) {
      sqlStatements.push('\n-- Mappings\n');
      sqlStatements.push(...mappings);
    }

    return {
      sql: sqlStatements.join('\n'),
      propertyCount: filters.length * 3, // SELL, BUY, SWAP
      mappingCount: mappings.length,
      nextId: currentId
    };
  }

  private generateHeader(categoryId: number): string {
    return `-- ======================================================
-- Dynamic Property Migration
-- Category ID: ${categoryId}
-- Generated: ${new Date().toISOString()}
-- ======================================================

-- Dynamic Property Definitions
`;
  }

  private generatePropertyInsert(
    id: number,
    filter: Filter,
    categoryId: number,
    noticeType: string
  ): string {
    const rules = JSON.stringify(filter.rules);
    return `INSERT INTO dynamic_property_definition (id, name, type, rules, category_id, notice_type, created_at, updated_at) VALUES
(${id}, '${filter.name}', '${filter.type}', '${rules}', ${categoryId}, '${noticeType}', NOW(), NOW());`;
  }

  private generateMapping(
    sellId: number,
    buyId: number,
    buyMaxId: number | null,
    categoryId: number,
    comparisonType: string
  ): string {
    return `INSERT INTO dynamic_property_mapping (sell_property_id, buy_property_id, buy_max_property_id, category_id, comparison_type, created_at, updated_at) VALUES
(${sellId}, ${buyId}, ${buyMaxId || 'NULL'}, ${categoryId}, '${comparisonType}', NOW(), NOW());`;
  }

  generateMigrationFile(
    filters: Filter[],
    config: MigrationConfig,
    filename: string
  ): string {
    const result = this.generateMigration(filters, config);
    
    return `-- Migration File: ${filename}
-- Generated: ${new Date().toISOString()}
-- Properties: ${result.propertyCount}
-- Mappings: ${result.mappingCount}

${result.sql}

-- Next available ID: ${result.nextId}
`;
  }
}

