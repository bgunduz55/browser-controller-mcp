/**
 * Migration Templates
 * SQL templates for different migration types
 */

export const MIGRATION_TEMPLATES = {
  header: (categoryId: number, categoryName: string) => `-- ======================================================
-- ${categoryName.toUpperCase()} (ID: ${categoryId}) - Dynamic Properties Migration
-- ======================================================
-- Generated: ${new Date().toISOString()}
-- Description: Dynamic properties for ${categoryName} category
-- Notice Types: SELL, BUY, SWAP
-- ======================================================

`,

  propertyInsert: (id: number, name: string, type: string, rules: string, categoryId: number, noticeType: string) => 
    `INSERT INTO dynamic_property_definition (id, name, type, rules, category_id, notice_type, created_at, updated_at) VALUES
(${id}, '${name}', '${type}', '${rules}', ${categoryId}, '${noticeType}', NOW(), NOW());`,

  mappingInsert: (sellId: number, buyId: number, buyMaxId: number | null, categoryId: number, comparisonType: string) =>
    `INSERT INTO dynamic_property_mapping (sell_property_id, buy_property_id, buy_max_property_id, category_id, comparison_type, created_at, updated_at) VALUES
(${sellId}, ${buyId}, ${buyMaxId || 'NULL'}, ${categoryId}, '${comparisonType}', NOW(), NOW());`,

  footer: (nextId: number) => `
-- ======================================================
-- Migration completed
-- Next available ID: ${nextId}
-- ======================================================
`
};

export const CATEGORY_NAMES: Record<number, string> = {
  1: 'Emlak',
  2: 'Vasıta',
  3: 'Araç Yedek Parça & Aksesuar',
  4: 'İkinci El ve Sıfır Alışveriş',
  5: 'İş Makineleri & Sanayi',
  6: 'Ustalar & Hizmetler',
  7: 'Özel Ders Verenler',
  8: 'İş İlanları',
  9: 'Hayvanlar & Hayvancılık',
  10: 'Yardımcı Arayanlar'
};

