/**
 * One-off data cleanup for PiagamIPP (2026-10-16).
 *
 * Fixes the three corruption classes left behind by the old, validation-less API:
 *   1. indents with negative totalTimeMinutes  -> recompute from stored received/completed values
 *   2. indents with type: ""                   -> re-derive from date/time + Sabah holiday rules
 *   3. indents with blank/null wardName         -> cannot be inferred; reported for manual review
 *                                                 (deletion requires the --delete-blank-ward flag)
 *
 * Usage:
 *   node scripts/cleanup-data-2026-10-16.js                   # dry run: report only, change nothing
 *   node scripts/cleanup-data-2026-10-16.js --apply           # apply fixes 1 + 2
 *   node scripts/cleanup-data-2026-10-16.js --apply --delete-blank-ward   # also delete fix-3 records
 */
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const Holidays = require('date-holidays');

const APPLY = process.argv.includes('--apply');
const DELETE_BLANK_WARD = process.argv.includes('--delete-blank-ward');

// ---- mirror of src/lib/mongodb.ts -------------------------------------------------
function loadUri() {
  const envPath = path.join(process.cwd(), '.env.local');
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find((l) => l.startsWith('MONGODB_URI='));
  if (!line) throw new Error('MONGODB_URI not found in .env.local');
  return line.slice('MONGODB_URI='.length).trim();
}

// ---- mirror of calculateMinutes in src/app/api/indents/[id]/route.ts --------------
function calculateMinutes(dateReceived, timeReceived, dateCompleted, timeCompleted) {
  const [rh, rm] = timeReceived.split(':').map(Number);
  const start = new Date(Date.UTC(
    dateReceived.getUTCFullYear(), dateReceived.getUTCMonth(), dateReceived.getUTCDate(), rh, rm
  ));
  const [ch, cm] = timeCompleted.split(':').map(Number);
  const end = new Date(Date.UTC(
    dateCompleted.getUTCFullYear(), dateCompleted.getUTCMonth(), dateCompleted.getUTCDate(), ch, cm
  ));
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

// ---- mirror of src/lib/holiday.ts + src/lib/indent-type.ts ------------------------
const hd = new Holidays('MY', 'Sabah');
const SABAH_SUPPLEMENTAL = [{ month: 5, day: 30 }, { month: 5, day: 31 }];

function isSabahPublicHoliday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  try {
    if (hd.isHoliday(new Date(y, m - 1, d)) !== false) return true;
  } catch { /* fall through to supplemental */ }
  return SABAH_SUPPLEMENTAL.some((h) => h.month === m && h.day === d);
}

function determineIndentType(dateStr, timeStr) {
  const date = new Date(`${dateStr}T00:00:00+08:00`);
  const dayOfWeek = date.getDay();
  const [hours, minutes] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes;
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isPublicHoliday = isSabahPublicHoliday(dateStr);

  if (isPublicHoliday || isWeekend) {
    return totalMinutes >= 8 * 60 && totalMinutes < 15 * 60 ? 'ipp_shift' : 'on_call';
  }
  return totalMinutes >= 8 * 60 && totalMinutes < 17 * 60 ? 'office_hour' : 'on_call';
}

const fmt = (d) => (d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : String(d));

(async () => {
  const client = new MongoClient(loadUri(), { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const col = client.db('piagamipp').collection('indents');
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN (no changes made)'}`);

  // ---- 1. negative totalTimeMinutes ------------------------------------------------
  // Operator decision (2026-10-16): completion-before-receipt is physically impossible
  // and the auto-stamped completion time is trustworthy — recompute from stored values,
  // and if that still implies a negative, clamp to 0 rather than store nonsense.
  const negatives = await col.find({ totalTimeMinutes: { $lt: 0 } }).toArray();
  console.log(`\n[1] Negative totalTimeMinutes: ${negatives.length} record(s)`);
  let clampedCount = 0;
  const unrecoverable = [];
  for (const doc of negatives) {
    const canRecompute = doc.dateReceived instanceof Date && doc.timeReceived &&
      doc.dateCompleted instanceof Date && doc.timeCompleted;
    const newTotal = canRecompute
      ? calculateMinutes(doc.dateReceived, doc.timeReceived, doc.dateCompleted, doc.timeCompleted)
      : null;
    const finalTotal = newTotal === null ? null : Math.max(0, newTotal);
    console.log(`    ${doc._id}  ward=${JSON.stringify(doc.wardName)} recv=${fmt(doc.dateReceived)} ${doc.timeReceived} completed=${fmt(doc.dateCompleted)} ${doc.timeCompleted}  stored=${doc.totalTimeMinutes} -> ${finalTotal === null ? 'UNRECOVERABLE' : finalTotal}`);
    if (finalTotal === null) {
      unrecoverable.push(doc);
    } else {
      if (newTotal < 0) clampedCount += 1;
      if (APPLY) {
        await col.updateOne({ _id: doc._id }, { $set: { totalTimeMinutes: finalTotal } });
      }
    }
  }
  if (!APPLY && negatives.length) console.log('    (values above would be written with --apply)');

  // ---- 2. blank type ---------------------------------------------------------------
  const blankType = await col.find({ type: { $in: ['', null] } }).toArray();
  console.log(`\n[2] Blank/missing type: ${blankType.length} record(s)`);
  for (const doc of blankType) {
    const dateStr = doc.dateReceived instanceof Date ? fmt(doc.dateReceived) : null;
    const newType = dateStr && /^\d{2}:\d{2}$/.test(doc.timeReceived || '')
      ? determineIndentType(dateStr, doc.timeReceived)
      : null;
    console.log(`    ${doc._id}  ward=${JSON.stringify(doc.wardName)} recv=${dateStr} ${doc.timeReceived} rx=${doc.numberOfRx} -> type=${newType ?? 'CANNOT DERIVE'}`);
    if (newType && APPLY) {
      await col.updateOne({ _id: doc._id }, { $set: { type: newType } });
    }
  }
  if (!APPLY && blankType.length) console.log('    (types above would be written with --apply)');

  // ---- 3. blank/null wardName ------------------------------------------------------
  const blankWard = await col.find({ wardName: { $in: ['', null] } }).toArray();
  console.log(`\n[3] Blank/null wardName: ${blankWard.length} record(s) — cannot be inferred`);
  const wards = await client.db('piagamipp').collection('wards').find({}).project({ name: 1 }).sort({ name: 1 }).toArray();
  console.log(`    Known wards to choose from: ${wards.map((w) => w.name).join(', ')}`);
  for (const doc of blankWard) {
    console.log(`    ${doc._id}  recv=${fmt(doc.dateReceived)} ${doc.timeReceived} type=${JSON.stringify(doc.type)} rx=${doc.numberOfRx} cc=${doc.counterchecked} total=${doc.totalTimeMinutes}`);
  }
  if (blankWard.length && APPLY && DELETE_BLANK_WARD) {
    const res = await col.deleteMany({ _id: { $in: blankWard.map((d) => d._id) } });
    console.log(`    DELETED ${res.deletedCount} record(s)`);
  } else if (blankWard.length) {
    console.log('    (edit these in the UI, or re-run with --apply --delete-blank-ward to delete them)');
  }

  // ---- summary ---------------------------------------------------------------------
  const unresolved = unrecoverable.length + (blankWard.length && !(APPLY && DELETE_BLANK_WARD) ? blankWard.length : 0);
  console.log(`\nSummary: ${negatives.length} negative-total (${clampedCount} clamped to 0), ${blankType.length} blank-type, ${blankWard.length} blank-ward.`);
  if (unrecoverable.length) {
    console.log(`\nNeeds manual review (${unrecoverable.length}):`);
    for (const doc of unrecoverable) {
      console.log(`  ${doc._id}  missing received/completed fields  (recv=${fmt(doc.dateReceived)} ${doc.timeReceived}, completed=${fmt(doc.dateCompleted)} ${doc.timeCompleted})`);
    }
  }
  if (unresolved === 0) console.log('All issues resolved. 🎉');
  else console.log(`${unresolved} record(s) still need a human decision (see above).`);

  await client.close();
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
