const assert=require('node:assert/strict');
const E=require('./updates/engine.js');
const D=require('./dist/data.json');
const cards=require('./updates/spaced-plan.json');
D.tasks.push(...cards);
D.spaced=true; E.prepare(D);
assert.equal(cards.filter(t=>!t.reviewOf).length,94);
assert.equal(cards.filter(t=>t.interval===1).length,68);
assert.equal(cards.filter(t=>t.interval>1).length,31);
assert.equal(new Set(cards.map(t=>t.id)).size,cards.length);
const s=E.fresh();
E.auto(D,s,'2026-11-03');
for(const day of D.days){
 const items=E.tasksFor(D,s,day.date).filter(t=>t.module);
 if(day.weekday===6)assert.equal(items.length,0);
 assert(items.length<=6);
 assert(items.reduce((n,t)=>n+E.cost(t),0)<=8);
 assert(items.filter(t=>!t.reviewOf).length<=3);
}
assert.equal(cards.filter(t=>E.due(s,t)==='queue').length,0);
const review=cards.find(t=>t.interval===1&&t.originalDate==='2026-11-05');
const moduleCard=cards.find(t=>t.id===review.reviewOf);
assert.equal(E.due(s,review),'2026-11-05');
E.setDone(s,moduleCard,true,'2026-11-07T13:00:00Z');
E.auto(D,s,'2026-11-07');
assert(E.due(s,review)>='2026-11-09'&&E.due(s,review)!=='queue');
assert.equal(E.normalize(JSON.parse(JSON.stringify(s)),D).records[moduleCard.id].done,true);
console.log('Topic totals, preview, capacities, Sunday, delayed completion and backup round trip passed.');
