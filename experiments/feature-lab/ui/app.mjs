import '/terminal.js';
import example from './data/interpretation-example.mjs';
import {fixtures,quantityText,chartCoordinates} from './table-model.mjs';
import {runBenchmarks} from './browser-benchmark.mjs';
const $=id=>document.getElementById(id), main=$('view');
const data=fixtures(5000).map((row,i)=>i%503===0?{...row,delivery_date:null}:row);
const index=OpenSlottingTerminal.buildIndex(data);
let locale='de',view='import',selected=index.entities.article[0].key,query='',lastBenchmark;
const mappingDraft={};let mappingConfirmed=false;
const text={de:{import:'Import prüfen',article:'Artikel untersuchen',compare:'Perioden vergleichen',source:'Quellen',columns:'Quellspalten & Vorschläge',evidence:'Quellnachweis',required:'Pflichtfelder',position:'Position',occurrence:'Vorkommen',score:'Evidenzpunkte',unknown:'Prüfung erforderlich',strong:'Starker Vorschlag',confirm:'Zuordnung im Labor bestätigen',confirmed:'Zuordnung bestätigt; nur im Arbeitsspeicher des Labors.',choose:'Spalte wählen',rows:'Zeilen',amount:'Menge',articles:'Artikel',search:'Artikel suchen',details:'Analyse & Verlauf',raw:'Originalwerte',compareTitle:'Perioden & Datenabdeckung',from:'Von',to:'Bis',periodA:'Zeitraum A',periodB:'Zeitraum B',noData:'Keine passenden Daten',difference:'Differenz B − A',count:'Gültig datierte Zeilen',unknownDates:'Zeilen ohne Datum',run:'Benchmarks starten',ready:'Bereit',finished:'Vergleich abgeschlossen',bench:'Tabellenverfahren vergleichen',privacy:'Nur synthetische Daten. Keine Verbindung zur Arbeitsbereichsdatenbank, kein Upload und keine Speicherung von Änderungen.'},
en:{import:'Review import',article:'Inspect articles',compare:'Compare periods',source:'Sources',columns:'Source columns & suggestions',evidence:'Source evidence',required:'Required fields',position:'Position',occurrence:'Occurrence',score:'Evidence points',unknown:'Review required',strong:'Strong suggestion',confirm:'Confirm mapping in laboratory',confirmed:'Mapping confirmed; laboratory memory only.',choose:'Choose column',rows:'Rows',amount:'Quantity',articles:'Articles',search:'Search articles',details:'Analysis & trend',raw:'Original values',compareTitle:'Periods & data coverage',from:'From',to:'To',periodA:'Period A',periodB:'Period B',noData:'No matching data',difference:'Difference B − A',count:'Valid dated rows',unknownDates:'Rows without date',run:'Start benchmarks',ready:'Ready',finished:'Comparison complete',bench:'Compare table rendering',privacy:'Synthetic data only. No workspace database connection, upload or persistent changes.'}};
const t=key=>text[locale][key]||key;
const bi=(de,en)=>locale==='de'?de:en;
function el(tag,content,className) {const node=document.createElement(tag);if(content!==undefined)node.textContent=content;if(className)node.className=className;return node;}
function panel(title,tag='section') {const node=el(tag,undefined,'panel');node.append(el('h2',title));return node;}
function note(value){return el('p',value,'muted');}
function table(headers,rows) {
  const wrap=el('div',undefined,'table-wrap'),table=el('table'),head=el('thead'),tr=el('tr'),body=el('tbody');
  headers.forEach(value=>{const th=el('th',value);th.scope='col';tr.append(th);});head.append(tr);
  rows.forEach(values=>{const row=el('tr');values.forEach(value=>row.append(el('td',value)));body.append(row);});table.append(head,body);wrap.append(table);return wrap;
}
function metrics(values){const node=el('div',undefined,'metrics');values.forEach(([label,value])=>{const card=el('div',undefined,'metric');card.append(el('strong',value),el('span',label));node.append(card);});return node;}
function sourceView() {
  const layout=el('div',undefined,'layout'),sources=panel(t('source'),'aside'),work=panel(t('columns')),audit=panel(t('evidence'),'aside');
  sources.append(el('span','synthetic-io.csv','badge good'),note('UTF-8 · order-lines'),note('2 '+t('rows')+' · 4 '+(locale==='de'?'physische Spalten':'physical columns')),
    note(locale==='de'?'Zwei Spalten heißen „Menge“. Die physische Position bleibt eindeutig.':'Two columns are named “Menge”. Physical positions remain distinct.'));
  work.append(table([t('position'), 'Header',t('occurrence'),t('raw')],example.catalog.map((c,i)=>[String(c.position),c.header,String(c.occurrence),example.rows.map(r=>r[i]).join(' / ')])));
  work.append(note(locale==='de'?'Vorschläge stammen aus dem getesteten Profilmodul. Punkte sind keine Wahrscheinlichkeit. Fachliche Bedeutung muss bestätigt werden.':'Suggestions come from the tested profiling module. Points are not probabilities. Confirm business meaning.'));
  const mapping=mappingDraft,confirm=el('button',t('confirm')),status=el('p','');status.setAttribute('role','status');confirm.type='button';confirm.disabled=true;
  const reasons={exact_alias:bi('Bekannter Header','Known header'),token_alias:bi('Header-Token','Header token'),numeric_format_support:bi('Zahlenformat passt','Numeric format supports'),date_format_support:bi('Datumsformat passt','Date format supports'),value_type_conflicts_with_header:bi('Werte widersprechen Header','Values conflict with header'),no_nonempty_value_evidence:bi('Keine Werte','No values')};
  function checkMapping(){
    const positions=Object.values(mapping).filter(value=>value!=='');
    const complete=example.suggestions.every(s=>mapping[s.targetField]!==undefined&&mapping[s.targetField]!=='');
    const conflict=new Set(positions).size!==positions.length;
    confirm.disabled=!complete||conflict;
    status.textContent=conflict?bi('Eine Quellposition ist mehreren Pflichtfeldern zugeordnet.','One source position is assigned to several required fields.'):mappingConfirmed?t('confirmed')+' '+JSON.stringify(mapping):'';
  }
  for(const suggestion of example.suggestions){
    const field=el('div',undefined,'field'),top=suggestion.topK[0],label=el('label',suggestion.targetField),select=el('select');
    select.id='mapping-'+suggestion.targetField;select.setAttribute('aria-label',suggestion.targetField);label.htmlFor=select.id;select.append(new Option(t('choose'),''));
    example.catalog.forEach(c=>select.append(new Option(c.position+' · '+c.header+' · #'+c.occurrence,String(c.position))));
    select.value=mapping[suggestion.targetField]??'';
    select.addEventListener('change',()=>{mappingConfirmed=false;mapping[suggestion.targetField]=select.value;checkMapping();});
    label.append(select);field.append(label,el('span',t(suggestion.uncertain?'unknown':'strong'),'badge'+(suggestion.uncertain?'':' good')));
    if(top){field.append(note(t('position')+' '+top.position+' · '+t('score')+' '+top.score+' · '+bi('Abstand','margin')+' '+suggestion.margin));const reasonsList=el('ul');top.reasons.forEach(reason=>reasonsList.append(el('li',reasons[reason]||reason)));field.append(reasonsList);}
    work.append(field);
  }
  confirm.addEventListener('click',()=>{mappingConfirmed=true;checkMapping();});checkMapping();work.append(confirm,status);
  audit.append(el('h3','synthetic-io · '+bi('Zeile','row')+' 2'),table(['ArtNr','Menge #1','Menge #2','Datum'],[example.rows[0]]),note(locale==='de'?'„defekt“ bleibt als Originalwert sichtbar. Die zweite Mengenspalte ist numerisch plausibel. Das ersetzt keine fachliche Prüfung.':'“defekt” remains visible as an original value. The second quantity column is numerically plausible. This does not replace business review.'),
    note(locale==='de'?'Nächster Schritt: Vorschau prüfen → Zuordnung bestätigen → Importieren. Hier wird kein Import gespeichert.':'Next step: review preview → confirm mapping → import. This laboratory does not save imports.'));
  layout.append(sources,work,audit);main.append(layout);
}
function chart(points) {
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 600 180');svg.setAttribute('class','chart');svg.setAttribute('role','img');
  const title=document.createElementNS(ns,'title');title.textContent=locale==='de'?'Tägliche Menge; exakte Werte in der Tabelle':'Daily quantity; exact values in the table';svg.append(title);
  const line=document.createElementNS(ns,'polyline');
  line.setAttribute('points',chartCoordinates(points).map(point=>point.join(',')).join(' '));svg.append(line);
  for(const [x,value] of [[20,points[0]?.date||''],[470,points.at(-1)?.date||'']]){const label=document.createElementNS(ns,'text');label.setAttribute('x',x);label.setAttribute('y',170);label.textContent=value;svg.append(label);}return svg;
}
function articleView() {
  const layout=el('div',undefined,'layout'),picker=panel(t('search'),'aside'),detail=panel(t('details')),audit=panel(t('evidence'),'aside');
  const label=el('label',t('search')),input=el('input');input.id='article-search';input.type='search';input.value=query;label.htmlFor=input.id;label.append(input);picker.append(label);
  const list=el('div',undefined,'results-list');picker.append(list);
  function showMatches(){list.replaceChildren();const matches=index.entities.article.filter(a=>a.key.includes(query)).slice(0,30);
    matches.forEach(a=>{const button=el('button');button.type='button';button.setAttribute('aria-pressed',String(a.key===selected));button.append(el('span',a.key),el('span',quantityText(a.quantity,locale)));button.addEventListener('click',()=>{selected=a.key;render();main.querySelector('.results-list button[aria-pressed="true"]')?.focus({preventScroll:true});});list.append(button);});
    if(!matches.length)list.append(note(t('noData')));
  }
  input.addEventListener('input',()=>{query=input.value;showMatches();});showMatches();
  const summary=OpenSlottingTerminal.selectedSummary(data,'article',selected,index.latestDate,'all');
  detail.append(el('h3',selected),metrics([[t('amount'),quantityText(summary.quantity,locale)],[t('rows'),String(summary.lines)],[bi('Aufträge','Orders'),String(summary.orders)]]),chart(summary.points));
  const extra=el('details'),caption=el('summary',locale==='de'?'Exakte Tageswerte öffnen':'Open exact daily values');extra.append(caption,table([bi('Datum','Date'),t('amount'),t('rows')],summary.points.map(p=>[p.date,quantityText(p.quantity,locale),String(p.lines)])));detail.append(extra,note(locale==='de'?'Detail zuerst; Rohzeilen und Qualität bei Bedarf. Suche und Auswahl bleiben getrennte Schritte.':'Progressive detail; raw rows and quality on demand. Searching and selecting remain separate steps.'));
  audit.append(note('synthetic-0/1/2 · '+t('raw')),table([bi('Quelle','Source'),bi('Zeile','Row'),t('amount')],summary.latest.slice(0,8).map(r=>[r.source_file,String(r.source_line),quantityText(r.quantity,locale)])),note(locale==='de'?'5000 synthetische Bewegungen; 10 ohne Datum. Undatierte Zeilen werden im Zeitraum nicht als Nullnachfrage behandelt.':'5000 synthetic movements; 10 without dates. Undated rows are not treated as zero demand in periods.'));
  layout.append(picker,detail,audit);main.append(layout);
}
function compareView() {
  const layout=el('div',undefined,'layout comparison'),work=panel(t('compareTitle')),audit=panel(t('evidence'),'aside'),fields=el('div',undefined,'period-fields'),output=el('div');
  const inputs={};for(const [key,title,from,to] of [['a','periodA','2026-09-01','2026-09-14'],['b','periodB','2026-09-15','2026-09-28']]){
    const panel=el('fieldset'),legend=el('legend',t(title));panel.append(legend);
    for(const [suffix,caption,value] of [['from','from',from],['to','to',to]]){const input=el('input'),label=el('label',t(caption));input.type='date';input.id=key+'-'+suffix;input.value=value;label.htmlFor=input.id;label.append(input);panel.append(label);inputs[key+suffix]=input;input.addEventListener('change',update);}fields.append(panel);
  }
  function update(){output.replaceChildren();const summaries={};for(const key of ['a','b']){
    const from=inputs[key+'from'].value,to=inputs[key+'to'].value;if(!from||!to||from>to){output.append(el('p',locale==='de'?'Datumsbereich prüfen':'Check date range','badge'));return;}
    let quantity=0n,lines=0;for(const row of data)if(row.delivery_date&&row.delivery_date>=from&&row.delivery_date<=to){quantity+=row.quantity;lines++;}summaries[key]={quantity,lines};
  }
    output.append(table(['',t('periodA'),t('periodB'),t('difference')],[[t('amount'),quantityText(summaries.a.quantity,locale),quantityText(summaries.b.quantity,locale),quantityText(summaries.b.quantity-summaries.a.quantity,locale)],[t('count'),String(summaries.a.lines),String(summaries.b.lines),String(summaries.b.lines-summaries.a.lines)]]),note(locale==='de'?'Überlappende Zeiträume sind erlaubt. Eine Zeile kann zu beiden gehören. Dies ist eine schmale UI-Vorschau, keine neue Vollanalyse.':'Overlapping periods are allowed. A row may belong to both. This is a narrow UI preview, not a new full analysis.'));
  }
  work.append(fields,output);update();audit.append(metrics([[t('unknownDates'),'10'],[t('rows'),'5000'],[t('articles'),'211']]),note(locale==='de'?'Datierungsabdeckung und Mengenänderung stehen nebeneinander. Distinct-Aufträge und -Kunden dürfen nicht durch einfache Prefix-Subtraktion berechnet werden.':'Date coverage and quantity change are shown together. Distinct orders and customers cannot be computed by simple prefix subtraction.'),note(locale==='de'?'Der getrennte Analyse-Benchmark prüft exakte Prefix-Summen und den vollständigen bestehenden Periodenvertrag.':'The separate analysis benchmark checks exact prefix sums and the existing full period contract.'));
  layout.append(work,audit);main.append(layout);
}
function render(){document.documentElement.lang=locale;$('privacy').textContent=t('privacy');$('bench-heading').textContent=t('bench');$('run').textContent=t('run');
  document.querySelector('h1').textContent=bi('Feature-Labor','Feature laboratory');
  document.querySelector('.eyebrow').textContent=bi('OpenSlotting · getrenntes Experiment','OpenSlotting · isolated experiment');
  document.querySelector('nav').setAttribute('aria-label',bi('Laboransichten','Laboratory views'));
  $('bench-description').textContent=bi('10.000 / 50.000 Zeilen, identische Virtualisierung. Neuanlage, Zeilenpool und Wiederverwendung anhand des Quellschlüssels.','10,000 / 50,000 rows, identical virtualization. Fresh rows, a row pool and reuse by source identity.');
  document.querySelector('footer').textContent=bi('Labor auf 127.0.0.1 · Python-Standardbibliothek · Native HTML-Elemente · Keine produktiven Nutzerdaten','Laboratory on 127.0.0.1 · Python standard library · Native HTML elements · No production user data');
  $('raw-summary').textContent=bi('Rohmesswerte (JSON)','Raw samples (JSON)');
  if(!$('run').disabled)$('status').textContent=t($('results').hidden?'ready':'finished');
  document.querySelectorAll('nav button').forEach(button=>{button.textContent=t(button.dataset.view);button.setAttribute('aria-pressed',String(button.dataset.view===view));});main.replaceChildren();({import:sourceView,article:articleView,compare:compareView}[view])();renderBenchmarkSummary();}
function renderBenchmarkSummary(){
  $('bench-summary').replaceChildren();if(!lastBenchmark)return;
  $('bench-summary').append(note(bi('Median in ms für jeweils 80 DOM-/Layoutupdates. Keine FPS-Messung.','Median ms per 80 DOM/layout updates. No FPS measurement.')),table([t('rows'),bi('Aufgabe','Workload'),bi('Neuanlage','Fresh rows'),bi('Zeilenpool','Row pool'),bi('Quellschlüssel','Source key')],lastBenchmark.results.map(r=>[String(r.count),r.workload,...['fragment','pool','keyed'].map(v=>r.medianMs[v].toFixed(2))])));
}
document.querySelectorAll('nav button').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;render();}));
$('locale').addEventListener('change',()=>{locale=$('locale').value;render();});
$('run').addEventListener('click',async()=>{const button=$('run');button.disabled=true;$('results').hidden=true;$('results').textContent='';$('bench-summary').replaceChildren();
  try{const result=await runBenchmarks($('bench-host'),message=>{$('status').textContent=message;});$('results').textContent=JSON.stringify(result,null,2);$('results').hidden=false;$('status').textContent=t('finished');
    lastBenchmark=result;renderBenchmarkSummary();
  }
  catch(error){$('status').textContent='ERROR: '+error.message;throw error;}finally{button.disabled=false;}});
render();
