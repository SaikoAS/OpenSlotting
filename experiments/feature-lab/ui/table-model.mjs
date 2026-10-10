export const columns = ['article_id', 'delivery_date', 'quantity', 'customer', 'order_id', 'source_file', 'source_line'];
export function rowKey(row) { return JSON.stringify([row.source_file_id, row.source_line]); }
export function fixtures(count) {
  return Array.from({length:count}, (_,i) => ({source_file_id:'synthetic-'+i%3,
    source_line:i+2, article_id:String(i%211).padStart(6,'0'), delivery_date:'2026-09-'+String(i%28+1).padStart(2,'0'),
    quantity:BigInt(i%97-11)*10000000n, customer:'K'+i%79, order_id:'A'+Math.floor(i/4), source_file:'Labor-'+i%3+'.csv'}));
}
export function quantityText(value, locale) {
  const sign=value<0n?'-':'', magnitude=value<0n?-value:value;
  const fraction=String(magnitude%10000000n).padStart(7,'0').replace(/0+$/,'');
  return sign+String(magnitude/10000000n)+(fraction?(locale==='de'?',':'.')+fraction:'');
}
export function cellValue(row, key, locale) {
  if (key==='quantity') return quantityText(row.quantity,locale);
  if (key==='delivery_date' && locale==='de' && row.delivery_date) return row.delivery_date.split('-').reverse().join('.');
  return String(row[key] ?? '');
}
export function windowKey(rows, visible, locale, selectedColumns, revision) {
  // Row-array identity is checked separately. Include column identity, not only count.
  return JSON.stringify([visible.start,visible.end,locale,selectedColumns,revision]);
}
export function chartCoordinates(points) {
  let min=0n,max=1n;
  for(const point of points){if(point.quantity<min)min=point.quantity;if(point.quantity>max)max=point.quantity;}
  const span=max-min;
  return points.map((point,i)=>[20+i*560/Math.max(1,points.length-1),
    145-Number((point.quantity-min)*120000n/span)/1000]);
}
