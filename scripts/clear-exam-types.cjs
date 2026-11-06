// Preparation form, not a claim that every rewritten prompt is a verbatim past paper.
const rows={
 C:['简答题','简答题','简答题','简答题','简答题','简答题','论述题','简答题','简答题','简答题','简答题','论述题','简答题','论述题','补漏复测'],
 O:['简答题','简答题','简答题','简答题','论述题','论述题','论述题','简答题','论述题','简答题','论述题','简答题','论述题','论述题','补漏复测','课本梳理'],
 F:['名词解释','名词解释','简答题','名词解释','名词解释','简答题','简答题','名词解释','简答题','名词解释'],
 T:['简答题','简答题','简答题','简答题','简答题','简答题','分析题','简答题','简答题','论述题'],
 H:['分析题','分析题','简答题','分析题','分析题','分析题','分析题','分析题','分析题','分析题','补漏复测']
};
module.exports=function(items,codes){const counts={};return Object.fromEntries(items.map(it=>{const code=codes[it.course],i=counts[code]||0;counts[code]=i+1;const type=rows[code][i];if(!type)throw Error('Missing type '+it.date+code);let examItems=[{type,title:it.main,origin:'备考题型整理'}];
 if(it.date==='2026-11-06'&&code==='O')examItems=[{type:'名词解释',title:'新月诗派',origin:'教材基础整理'},{type:'简答题',title:'简述闻一多“三美”的内容，并联系具体诗作说明。',origin:'备考题型整理'}];
 if(it.date==='2026-11-07'&&code==='F')examItems=[{type:'名词解释',title:'骑士文学',origin:'备考题型整理'},{type:'简答题',title:'结合《神曲》说明其中的宗教观念与新因素。',origin:'教材理解整理'}];
 if(it.date==='2026-11-19'&&code==='F')examItems=[{type:'名词解释',title:'古典主义；三一律',origin:'备考题型整理'}];
 return [`clear-${it.date}-${code}`,examItems];}));};
