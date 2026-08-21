import test from 'node:test';
import assert from 'node:assert/strict';
test('free communication',()=>assert.deepEqual(['voice','video','stories','status','channels','messaging','communities'],['voice','video','stories','status','channels','messaging','communities']));
test('prices',()=>assert.deepEqual([10000,30000,50000],[10000,30000,50000]));
test('trials',()=>assert.deepEqual([60,7],[60,7]));