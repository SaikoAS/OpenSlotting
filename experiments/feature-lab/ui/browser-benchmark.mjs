import {fixtures,columns} from './table-model.mjs';
import {createRenderer,snapshot} from './renderers.mjs';
const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
const assert=(condition,message)=>{if(!condition) throw new Error(message);};
function mount(host) {
  const region=document.createElement('div');region.className='viewport';region.tabIndex=-1;
  const table=document.createElement('table'),body=document.createElement('tbody');table.append(body);region.append(table);host.replaceChildren(region);
  return {body,region};
}
export async function runBenchmarks(host,progress) {
  const variants=['fragment','pool','keyed'], results=[], checks=[];
  for(const count of [10000,50000]) {
    const rows=fixtures(count);
    for(const workload of ['scroll-overlap','jump','same-window']) {
      const samples=Object.fromEntries(variants.map(v=>[v,[]])),created=Object.fromEntries(variants.map(v=>[v,[]])),initial=Object.fromEntries(variants.map(v=>[v,[]]));
      for(let repeat=-1;repeat<5;repeat++) {
        const order=variants.slice((repeat+1)%3).concat(variants.slice(0,(repeat+1)%3));
        for(const variant of order) {
          const {body,region}=mount(host), renderer=createRenderer(variant,body,region);
          const options={columns,locale:'de',revision:1};
          const initialBegin=performance.now();
          renderer.render(rows,OpenSlottingTerminal.visibleLineWindow(count,3200,480,32,8),options);
          region.scrollTop=3200;
          void body.offsetHeight; const initialElapsed=performance.now()-initialBegin;
          // Each sample is 80 updates. DOM + synchronous layout, not paint/FPS.
          await frame(); const begin=performance.now();
          for(let step=0;step<80;step++) {
            const scroll=workload==='same-window'?3200:workload==='jump'?3200+(step%13)*4000:3200+step*256;
            renderer.render(rows,OpenSlottingTerminal.visibleLineWindow(count,scroll,480,32,8),options);
            region.scrollTop=scroll;
            void body.offsetHeight;
          }
          const elapsed=performance.now()-begin;
          const visible=OpenSlottingTerminal.visibleLineWindow(count,workload==='same-window'?3200:workload==='jump'?3200+(79%13)*4000:3200+79*256,480,32,8);
          const expected=rows.slice(visible.start,visible.end).map(r=>r.source_line);
          assert(JSON.stringify(snapshot(body).map(r=>Number(r.line)))===JSON.stringify(expected),variant+' source lines');
          if(repeat>=0) {samples[variant].push(elapsed);created[variant].push(renderer.stats.createdRows);initial[variant].push(initialElapsed);}
        }
      }
      const medians=Object.fromEntries(variants.map(v=>[v,median(samples[v])]));
      results.push({count,workload,updatesPerSample:80,viewport:480,rowHeight:32,overscan:8,samplesMs:samples,medianMs:medians,createdRows:created,initialSamplesMs:initial,initialMedianMs:Object.fromEntries(variants.map(v=>[v,median(initial[v])])),
        relative: Object.fromEntries(variants.map(v=>[v,medians.fragment/medians[v]]))});
      progress(count+' / '+workload);
    }
  }
  const rows=fixtures(120), visible={start:20,end:51,before:640,after:2208};
  let reference;
  for(const variant of variants) {
    const {body,region}=mount(host),renderer=createRenderer(variant,body,region);
    renderer.render(rows,visible,{columns,locale:'de',revision:1,selected:rows[24].article_id});
    const actual=snapshot(body);if(reference) assert(JSON.stringify(actual)===JSON.stringify(reference),'full cell parity '+variant);else reference=actual;
    const key=body.children[5].dataset.key;body.children[5].querySelector('button').focus();
    renderer.render(rows,{start:22,end:53,before:704,after:2144},{columns,locale:'de',revision:1});
    assert(document.activeElement.closest('tr')?.dataset.key===key,'focus identity '+variant);
    renderer.render(rows,visible,{columns:['source_line','article_id'],locale:'en',revision:2});
    assert(snapshot(body)[0].cells[0]==='22','column identity '+variant);
    rows[20]={...rows[20],article_id:'<img src=x onerror=alert(1)>'};
    renderer.render(rows,visible,{columns,locale:'en',revision:3});
    assert(body.querySelector('img')===null && snapshot(body)[0].cells[0].startsWith('<img'),'text safety '+variant);
    rows[20]=fixtures(21)[20];
    renderer.render([], {start:0,end:0,before:0,after:0},{columns,locale:'en',revision:4});
    assert(body.textContent==='No rows','empty '+variant);checks.push({variant,cellParity:true,focusIdentity:true,columnChange:true,revisionChange:true,textSafety:true,emptyState:true});
  }
  host.replaceChildren();
  return {timestamp:new Date().toISOString(),engine:navigator.userAgent,baselineCommit:'59525a447004396b47747f587c7ba14511357719',
    scope:'Reconstructed current virtual DOM pattern; isolated native table, 7 columns. No complete application benchmark or FPS measurement.',
    sampling:'one warmup + five rotated samples per variant; median; 80 synchronous DOM updates with layout reads per sample; fixture generation excluded',results,checks};
}
