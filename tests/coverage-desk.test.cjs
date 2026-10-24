'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const path = require('node:path'), source = fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').replace(/\r\n/g,'\n');
const html = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function fn(name) { const start=source.search(new RegExp('  (?:async )?function '+name+'\\('));return source.slice(start,start+1+source.slice(start+1).search(/\n  (?:async )?function \w+\(/)); }
function node(dataset={}) { const classes=new Set();return {dataset,children:[],attributes:{},classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)},setAttribute(key,value){this.attributes[key]=value;},appendChild(child){this.children.push(child);},replaceChildren(){this.children=[];}}; }
test('expected weekdays belong only to coverage, alongside four uniquely linked views',()=>{
  const coverage=html.slice(html.indexOf('id="coverage-page"'),html.indexOf('id="comparison-page"'));
  const comparison=html.slice(html.indexOf('id="comparison-page"'),html.indexOf('id="analysis-page"'));
  assert.equal((coverage.match(/name="expected-weekday"/g)||[]).length,7);assert.doesNotMatch(comparison,/name="expected-weekday"/);
  for(const view of ['calendar','sources','dates','evidence'])assert.equal((coverage.match(new RegExp('data-coverage-view="'+view+'"','g'))||[]).length,1);
  assert.match(coverage,/id="coverage-evidence-pagination"/);
});
test('coverage views expose exactly one panel and evidence requires an active selection',()=>{
  const keys=['calendar','sources','dates','evidence'],elements={coverageViews:keys.map(key=>node({coverageView:key})),coverageViewPanels:keys.map(key=>node({coveragePanel:key}))};
  const state={coverageView:'calendar',coverageReturnView:'calendar',result:{},coverageDrilldown:null};
  const context=vm.createContext({state,elements});vm.runInContext(fn('renderCoverageViews'),context);
  for(const view of ['calendar','sources','dates']){state.coverageView=view;context.renderCoverageViews();assert.equal(elements.coverageViewPanels.filter(panel=>!panel.classList.contains('hidden')).length,1);assert.equal(elements.coverageViews.find(button=>button.dataset.coverageView===view).attributes['aria-selected'],'true');}
  assert.equal(elements.coverageViews[3].disabled,true);
  state.coverageDrilldown={type:'date',value:'2026-08-03'};state.coverageView='evidence';context.renderCoverageViews();assert.equal(elements.coverageViews[3].disabled,false);assert.equal(elements.coverageViewPanels[3].classList.contains('hidden'),false);
  state.coverageDrilldown=null;state.coverageReturnView='sources';context.renderCoverageViews();assert.equal(state.coverageView,'sources');
});
test('evidence pages bound DOM rows while preserving totals across valid rows and issues',()=>{
  const state={coverageDrilldown:{type:'source',value:'source-a'},coverageEvidencePage:1,result:{files:[{id:'source-a',label:'a.csv',sourceType:'order-lines'}],rows:Array.from({length:70},(_,i)=>({source_file_id:'source-a',source_file_label:'a.csv',source_line:i+2,delivery_date:'2026-08-03',article_id:'SKU',quantity:1n})),issues:Array.from({length:3},(_,i)=>({sourceFileId:'source-a',sourceLine:i+72,deliveryDate:'2026-08-03',message:'Synthetic issue'}))}};
  const elements=Object.fromEntries(['coverageDrilldown','coverageDrilldownTitle','coverageDrilldownSummary','coverageDrilldownTableBody','coverageEvidencePagination','coverageEvidencePrevious','coverageEvidenceNext','coverageEvidencePageStatus'].map(key=>[key,node()]));
  const messages=[];const context=vm.createContext({state,elements,TABLE_PAGE_SIZE:25,Map,Set,core:{issueIsBlocking:()=>true},document:{createElement:node},optionalText:value=>value||'—',formatQuantity:String,
    setText:(node,value)=>{node.textContent=value;},translate:(key,values)=>{messages.push({key,values});return key;},appendCell:(row,value)=>row.children.push(value)});
  vm.runInContext(fn('renderCoverageDrilldown'),context);context.renderCoverageDrilldown();assert.equal(elements.coverageDrilldownTableBody.children.length,25);assert.equal(elements.coverageEvidencePrevious.disabled,true);
  state.coverageEvidencePage=3;context.renderCoverageDrilldown();assert.equal(elements.coverageDrilldownTableBody.children.length,23);assert.equal(elements.coverageEvidenceNext.disabled,true);
  const summary=messages.filter(message=>message.key==='coverage_drilldown_summary').at(-1).values;assert.equal(summary.valid,70);assert.equal(summary.invalid,3);
  assert.equal(messages.at(-1).values.pages,3);assert.equal(messages.at(-1).values.count,23);
});
