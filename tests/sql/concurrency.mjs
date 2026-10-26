// Disposable local database only. Seed fixtures as documented in docs/audit.md.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
const run = promisify(execFile);
const query = async sql => (await run('psql', ['-h', '/tmp', '-p', '55439', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql])).stdout.trim();
const proposal = 'c0000000-0000-4000-8000-000000000021';
const ids = await Promise.all(Array.from({ length: 12 }, () => query(`SELECT (reserve_payment('${proposal}')).id`)));
assert.equal(new Set(ids).size, 1);
assert.equal(await query(`SELECT count(*) FROM payment_attempts WHERE proposal_id='${proposal}'`), '1');
await query(`SELECT (attach_payment_order('${ids[0]}','PARALLEL-ORDER',NULL)).id`);
await Promise.all(Array.from({ length: 12 }, () => query("SELECT (apply_payment_state('PARALLEL-ORDER','PARALLEL-CAPTURE','captured','{}')).status")));
assert.equal(await query(`SELECT count(*) FROM activity_events WHERE proposal_id='${proposal}' AND event_type='payment_completed'`), '1');
console.log('PASS: 12 concurrent reservations -> one attempt; 12 concurrent completions -> one payment activity.');
