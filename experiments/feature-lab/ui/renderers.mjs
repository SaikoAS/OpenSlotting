import {cellValue,rowKey,windowKey} from './table-model.mjs';
export function createRenderer(variant, body, region) {
  if (!['fragment','pool','keyed'].includes(variant)) throw new Error('Unknown renderer');
  let previousRows, previousWindow, signature='', pool=[], keyed=new Map();
  const stats={createdRows:0,renderCalls:0,skipped:0};
  function spacer(height, count) {
    const row=document.createElement('tr'), cell=document.createElement('td');
    row.className='spacer'; row.style.height=height+'px'; cell.style.height=height+'px'; cell.colSpan=count;
    row.append(cell); return row;
  }
  function createRow(columns) {
    const row=document.createElement('tr'); stats.createdRows++;
    columns.forEach(key=>{
      const cell=document.createElement('td');
      if(key==='article_id') {const button=document.createElement('button');button.type='button';cell.append(button);}
      if(key==='quantity') cell.className='number'; row.append(cell);
    }); return row;
  }
  function update(row, data, columns, locale, selected) {
    row.dataset.key=rowKey(data); row.dataset.source=data.source_file_id; row.dataset.line=String(data.source_line);
    row.classList.toggle('selected',data.article_id===selected);
    columns.forEach((key,i)=>{
      const cell=row.children[i], text=cellValue(data,key,locale);
      const target=key==='article_id'?cell.firstElementChild:cell;
      if(target.textContent!==text) target.textContent=text;
      if(key==='article_id') {target.dataset.article=data.article_id;target.setAttribute('aria-label', (locale==='de'?'Artikel ':'Article ')+text);}
    });
  }
  function render(rows,visible,{locale='de',columns,revision=0,selected=''}) {
    const guard=windowKey(rows,visible,locale,columns,revision)+'|'+selected;
    if(previousRows===rows && previousWindow===guard) {stats.skipped++;return;}
    const oldFocus=body.contains(document.activeElement)?document.activeElement.closest('tr')?.dataset.key:null;
    stats.renderCalls++;
    const newSignature=JSON.stringify(columns);
    if(signature!==newSignature) {pool=[];keyed=new Map();signature=newSignature;}
    const nodes=[], nextKeys=new Map();
    if(visible.before) nodes.push(spacer(visible.before,columns.length));
    for(let index=visible.start;index<visible.end;index++) {
      const offset=index-visible.start, data=rows[index], key=rowKey(data);
      let row=variant==='keyed'?keyed.get(key):variant==='pool'?pool[offset]:undefined;
      if(!row) row=createRow(columns);
      update(row,data,columns,locale,selected); nodes.push(row);
      if(variant==='pool') pool[offset]=row;
      if(variant==='keyed') nextKeys.set(key,row);
    }
    if(variant==='pool') pool.length=visible.end-visible.start;
    if(variant==='keyed') keyed=nextKeys; // bounded to the current visible window
    if(visible.after) nodes.push(spacer(visible.after,columns.length));
    if(rows.length===0) {
      const row=document.createElement('tr'),cell=document.createElement('td'); cell.colSpan=columns.length;
      cell.textContent=locale==='de'?'Keine Zeilen':'No rows';row.append(cell);nodes.push(row);
    }
    if(variant==='keyed') {
      const keep=new Set(nodes);
      for(const node of Array.from(body.children)) if(!keep.has(node)) node.remove();
      nodes.forEach((node,i)=>{if(body.children[i]!==node) body.insertBefore(node,body.children[i]||null);});
    } else {
      const fragment=document.createDocumentFragment();nodes.forEach(node=>fragment.append(node));body.replaceChildren(fragment);
    }
    if(oldFocus) {
      const retained=Array.from(body.children).find(row=>row.dataset.key===oldFocus);
      (retained?.querySelector('button') || region).focus({preventScroll:true});
    }
    previousRows=rows;previousWindow=guard;
  }
  return {render,stats};
}
export function snapshot(body) {
  return Array.from(body.querySelectorAll('tr[data-key]')).map(row=>({key:row.dataset.key,
    source:row.dataset.source,line:row.dataset.line,selected:row.classList.contains('selected'),
    cells:Array.from(row.children).map(cell=>cell.textContent),article:row.querySelector('button')?.dataset.article}));
}
