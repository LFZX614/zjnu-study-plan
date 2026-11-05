const fs = require('node:fs');
const assert = require('node:assert/strict');
const E = require('./updates/engine.js');
const read = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const data = read('dist/data.json');
data.tasks.push(...read('dist/spaced-plan-v3.json'), ...read('dist/reading-plan.json'));
data.spaced = true;
data.progressProfile = read('dist/progress-profile.json');
E.prepare(data);
const input = read(process.argv[2]);
const state = E.normalize(input, data);
E.auto(data, state, '2026-11-05');
const first = data.tasks.filter(task => task.module && !task.reviewOf);
const pending = first.filter(task => !E.done(state, task));
assert(pending.length > 0);
assert(pending.every(task => E.due(state, task) !== 'queue' && E.due(state, task) <= '2026-12-10'));
for (const task of pending) {
  assert(data.tasks.some(review => review.reviewOf === task.id && E.due(state, review) !== 'queue'));
}
for (const day of data.days) {
  const tasks = E.tasksFor(data, state, day.date).filter(task => task.module && !E.done(state, task));
  const fresh = tasks.filter(task => !task.reviewOf);
  const reviews = tasks.filter(task => task.reviewOf);
  assert(fresh.length <= 3);
  assert(fresh.every(task => day.subjects.includes(task.course)));
  assert(fresh.reduce((sum, task) => sum + E.cost(task), 0) <= 7);
  assert(reviews.reduce((sum, task) => sum + (task.fixedDate ? 10 : 5), 0) <= 20);
  if (day.weekday === 6) assert.equal(tasks.length, 0);
}
for (const course of new Set(first.map(task => task.course))) {
  const ordered = pending.filter(task => task.course === course).sort((a, b) => a.bookOrder - b.bookOrder || a.order - b.order);
  for (let i = 1; i < ordered.length; i++) {
    assert(E.due(state, ordered[i - 1]) <= E.due(state, ordered[i]));
  }
}
const find = title => first.find(task => task.title === title);
assert.equal(E.done(state, find('现代汉语概说')), true);
assert.equal(E.done(state, find('文学革命与现代社团')), true);
assert.deepEqual(
  E.tasksFor(data, state, '2026-11-05').filter(task => task.course === '古代文学' && task.reviewOf).map(task => task.title),
  ['秦汉散文与史记']
);
assert.equal(E.done(state, find('中世纪文学与但丁')), false);
assert.equal(E.done(state, find('古希腊罗马文学')), true);
assert.equal(E.done(state, find('语音 1｜音素、音位、声韵调及四呼')), false);
const todayTasks = E.tasksFor(data, state, '2026-11-05');
assert(todayTasks.some(task => task.id === 'review-2026-11-05-greek-check'));
assert(todayTasks.filter(task => !task.reviewOf && task.module).every(task => task.course === '文学理论'));
const seventh = E.tasksFor(data, state, '2026-11-07');
assert(seventh.some(task => task.title === '中世纪文学与但丁' && !task.reviewOf));
assert(seventh.some(task => task.title === '汉赋与汉乐府' && !task.reviewOf));
assert(seventh.some(task => task.id === 'review-2026-11-07-homer-heroes'));
for (const [id, record] of Object.entries(input.records)) {
  if (!state.records[id]) continue;
  assert.equal(state.records[id].note, record.note || '');
  assert.deepEqual(state.records[id].checkedQuestions || [], record.checkedQuestions || []);
}
const exported = JSON.stringify(state);
E.auto(data, state, '2026-11-05');
assert.equal(JSON.stringify(state), exported);
const imported = E.normalize(JSON.parse(exported), data);
E.auto(data, imported, '2026-11-05');
assert.equal(imported.progressProfile, state.progressProfile);
const finishedToday = E.normalize(JSON.parse(exported), data);
const theory = find('文学活动与四要素');
E.setDone(finishedToday, theory, true, '2026-11-05T15:00:00+08:00');
finishedToday.progressProfile = null;
finishedToday.lastAutoDate = null;
E.auto(data, finishedToday, '2026-11-05');
assert.equal(E.done(finishedToday, theory), true);
const frozen = E.normalize(JSON.parse(exported), data);
frozen.settings.autoCarry = false;
const before = pending.map(task => E.due(frozen, task));
E.auto(data, frozen, '2026-11-06');
assert.deepEqual(pending.map(task => E.due(frozen, task)), before);
const source = find('中世纪文学与但丁');
E.setDone(imported, source, true, '2026-11-09T12:00:00+08:00');
imported.lastAutoDate = null;
E.auto(data, imported, '2026-11-09');
assert.equal(E.due(imported, data.tasks.find(task => task.reviewOf === source.id && task.interval === 1)), '2026-11-10');
console.log(JSON.stringify({
  modules: first.length,
  confirmedLearned: first.length - pending.length,
  remaining: pending.length,
  lastFirstPass: pending.map(task => E.due(state, task)).sort().at(-1),
  seventh: seventh.filter(task => task.module).map(task => ({title: task.title, review: !!task.reviewOf})),
  result: 'coverage, limits, Sundays, textbook order, migration, preservation, import and actual-date review passed'
}, null, 2));
