'use strict';

// Labels sind explizit und unabhängig von Scoringfunktionen festgelegt.
// null = keine fachlich gesicherte Auswahl aus dem gegebenen Befund möglich.
// Kleine synthetische Challenge-Suite, keine ERP-/Betriebsdatenkalibrierung.
module.exports = [
  { name: 'bekannte-aliase', headers: ['Auftragsnr', 'ArtNr', 'GMenge', 'Lieferdatum'], rows: [['00001', '000001', '1,5', '2026-09-01'], ['00002', '000002', '2,5', '2026-09-02']], expected: { order_id: 0, article_id: 1, quantity: 2, delivery_date: 3 } },
  { name: 'doppelter-header-typkonflikt', headers: ['ArtNr', 'Menge', 'Menge', 'Datum'], rows: [['SKU1', 'defekt', '1,5', '2026-09-01'], ['SKU2', 'defekt', '2,5', '2026-09-02']], expected: { article_id: 0, quantity: 2, delivery_date: 3 } },
  { name: 'nur-wertformate', headers: ['F1', 'F2', 'F3', 'F4'], rows: [['SKU1', '1,5', '2,5', '2026-09-01'], ['SKU2', '2,5', '3,5', '2026-09-02']], expected: { quantity: null, delivery_date: null } },
  { name: 'zwei-plausible-mengen', headers: ['ArtNr', 'Menge', 'Menge', 'Datum'], rows: [['SKU1', '1,5', '2,5', '2026-09-01'], ['SKU2', '2,5', '3,5', '2026-09-02']], expected: { quantity: null } },
  { name: 'falscher-datumsheader', headers: ['ArtNr', 'Menge', 'Datum', 'Lieferdatum'], rows: [['SKU1', '1,5', 'unbekannt', '2026-09-01'], ['SKU2', '2,5', 'unbekannt', '2026-09-02']], expected: { delivery_date: 3 } },
  { name: 'leer', headers: ['ArtNr', 'Menge', 'Datum'], rows: [['', '', ''], ['', '', '']], expected: { quantity: null, delivery_date: null } },
  { name: 'tokens-und-zusatz', headers: ['Artikel-Nummer', 'Gesamtmenge (gebucht)', 'Lieferdatum (geplant)'], rows: [['000001', '1,5', '2026-09-01'], ['000002', '2,5', '2026-09-02']], expected: { article_id: 0, quantity: 1, delivery_date: 2 } },
  { name: 'fachlich-taeuschender-header', sourceContract: 'Menge ist Bestand; Datum ist Rechnungsdatum. Diese Semantik ist nicht im CSV selbst enthalten.', headers: ['ArtNr', 'Menge', 'Datum'], rows: [['000001', '1,5', '2026-09-01'], ['000002', '2,5', '2026-09-02']], expected: { quantity: null, delivery_date: null } }
];
