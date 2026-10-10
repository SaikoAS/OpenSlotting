'use strict';

function fixtures(count) {
  const labels = ['Äpfel', 'Öl', 'Überblick', 'Straße', 'İstanbul', 'Cafe\u0301', 'Café', '😀 Box'];
  const articles = Array.from({ length: count }, (_, index) => ({
    article_id: String(index).padStart(8, '0'), article_name: labels[index % labels.length] + ' Produkt ' + index,
    article_name_variants: ['Beschreibung Variante ' + index, 'Lot-' + (index % 29)],
    master_data: { zone: 'Zone-' + index % 101 }, master_custom_fields: { category: 'Kategorie-' + index % 31 },
    order_line_count: index % 23, total_quantity: 90071992547409930000000n + BigInt(index % 41)
  }));
  const rows = Array.from({ length: count }, (_, index) => ({
    article_id: articles[index].article_id, article_name: articles[index].article_name,
    customer_id: 'K' + String(index).padStart(8, '0'), customer_name: labels[index % labels.length] + ' Kunde ' + index,
    order_id: 'O' + String(index).padStart(8, '0'),
    delivery_date: index % 79 === 0 ? null : '2026-09-' + String(index % 28 + 1).padStart(2, '0'),
    quantity: 90071992547409930000000n + BigInt(index % 41), source_file_id: 'synthetic', source_line: index + 2
  }));
  return { articles, rows };
}

function queries(count) {
  const common = ['', '0', 'K', 'Ö', 'unknown', 'ÄPFEL', 'überblick', 'STRASSE', 'straße', 'İSTANBUL', 'café', 'cafe\u0301', '😀', 'Box', '\u0000', 'Zone-5', 'Kategorie-3', 'Beschreibung Variante'];
  const selective = Array.from({ length: 32 }, (_, index) => String(Math.floor(index * (count - 1) / 31)).padStart(8, '0'));
  return { cold: [...common, ...selective], alternating: selective.slice(0, 8), same: selective[7] };
}

module.exports = { fixtures, queries };
