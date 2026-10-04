'use strict';
const fs=require('node:fs');
const path=require('node:path');
const fixtures=require('../../io/benchmarks/fixtures.cjs');
const interpretation=require('../../io/modules/interpretation.cjs');
function example() {
  const sample=fixtures.interpretationCases()[1],catalog=fixtures.caseCatalog(sample);
  return {name:sample.name,headers:sample.headers,rows:sample.rows,catalog,
    suggestions:interpretation.suggestWithProfiles(catalog).filter(s=>['article_id','quantity','delivery_date'].includes(s.targetField))};
}
if(require.main===module){
  const json=JSON.stringify(example(),null,2);
  fs.writeFileSync(path.join(__dirname,'interpretation-example.json'),json+'\n');
  fs.writeFileSync(path.join(__dirname,'interpretation-example.mjs'),'// Generated from the tested IO module and synthetic fixture.\nexport default '+json+';\n');
}
module.exports={example};
