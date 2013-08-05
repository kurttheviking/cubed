var assert = require('assert');
var cubed = require('./index');

// verify cleaner
var eventName = 'Keiju-vs$-Jegger monster-head.count!';

eventNameCleaned = cubed.__test._clean(eventName);
eventNameExpected = 'keiju_vs_jegger_monster_head_count';

assert.equal(eventNameCleaned, eventNameExpected, 'internal _clean mongoifies event names');

console.log('cubed tests passed');
