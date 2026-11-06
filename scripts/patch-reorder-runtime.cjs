const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
let s=fs.readFileSync(path.join(__dirname,'app-before-reorder.js'),'utf8');
s=s.replace('plan.json?v=6','plan.json?v=8');
s=s.replace('${studyGroups(learning).map(chapterHTML).join(\'\')}','${studyGroups(learning.filter(t=>!optional(t))).map(chapterHTML).join(\'\')}${learning.some(optional)?`<details class="extra-list"><summary>关联查漏与章节自检 · 选做 ${learning.filter(optional).length}项</summary>${studyGroups(learning.filter(optional)).map(chapterHTML).join(\'\')}</details>`:\'\'}');
// Plan imports and cloud sync can call render after initial loading; the wrapper
// reapplies an unapplied revision without clearing completed tasks or notes.
s+='\n'+fs.readFileSync(path.join(__dirname,'reorder-runtime.js'),'utf8');
fs.writeFileSync(path.join(root,'dist','app-v2.js'),s);
const f=path.join(root,'dist','index.html');
fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/app-v2\.js\?v=\d+/g,'app-v2.js?v=8'));
console.log('Updated task migration, history and daily recall budget.');
