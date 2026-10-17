import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeReturnPath } from '../lib/session.mjs';

test('preserves a local protected destination and its query',()=>{
  assert.equal(safeReturnPath('/trades/123?view=details'),'/trades/123?view=details');
  assert.equal(safeReturnPath('/wishlist?description=Desk%20lamp'),'/wishlist?description=Desk%20lamp');
});
for(const value of [null,'','https://example.org','//example.org','/\\example.org','/%5cexample.org','/%2fexample.org','/\nexample.org']) {
  test(`rejects unsafe return destination ${JSON.stringify(value)}`,()=>{
    assert.equal(safeReturnPath(value),'/explore');
  });
}
