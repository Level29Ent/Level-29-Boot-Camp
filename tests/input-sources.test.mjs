import test from 'node:test';
import assert from 'node:assert/strict';
import {createInputSources} from '../input-sources.js';
test('aim stays held until every owning device releases it',()=>{
 const input=createInputSources();assert.equal(input.press('k','keyboard'),true);assert.equal(input.press('k','mouse'),false);
 assert.equal(input.release('k','mouse'),true);assert.equal(input.held('k'),true);assert.equal(input.release('k','keyboard'),false);assert.equal(input.held('k'),false);
});
test('device unplug releases only its actions, not simultaneously held keyboard controls',()=>{
 const input=createInputSources();input.press('w','keyboard');input.press('w','pad');input.press('j','pad');
 assert.deepEqual(input.releaseSource('pad').sort(),['j','w']);assert.equal(input.held('j'),false);assert.equal(input.held('w'),true);
 input.clear();assert.equal(input.held('w'),false);assert.equal(input.press('w','keyboard'),true);
});
test('repeated device press is idempotent; absent releases cannot create state',()=>{
 const input=createInputSources();assert.equal(input.release('k','mouse'),false);input.press('j','touch');assert.equal(input.press('j','touch'),false);input.release('j','touch');assert.equal(input.held('j'),false);
});
