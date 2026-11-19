/* Account-wide records and preferences in the private portal workbook. */
window.thSaved = (() => {
  'use strict';
  const sheet = 'Portal Saved State';
  let queue = Promise.resolve();

  function notice(message) {
    let status = document.getElementById('portal-sync-notice');
    if (!status) {
      status = document.createElement('div');
      status.id = 'portal-sync-notice';
      status.setAttribute('role', 'status');
      Object.assign(status.style, {position:'fixed', bottom:'12px', right:'12px',
        zIndex:'10000', maxWidth:'min(460px, 90vw)', padding:'12px',
        background:'#14273b', color:'#fff', border:'1px solid #7aa9cb', borderRadius:'8px'});
      document.body.append(status);
    }
    status.replaceChildren(document.createTextNode(message + ' '));
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'Dismiss';
    close.onclick = () => status.remove();
    status.append(close);
  }

  function legacy(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function rows() {
    return thValues("'Portal Saved State'!A2:F", 'UNFORMATTED_VALUE');
  }

  function records(source, section) {
    const result = new Map();
    for (const [area, key, payload, op] of source) {
      if (area !== section || !key || !['import', 'save'].includes(op)) continue;
      if (op === 'import' && result.has(key)) continue;
      try { result.set(key, JSON.parse(payload)); } catch { /* Ignore malformed workbook rows. */ }
    }
    return result;
  }

  function serial(operation) {
    const pending = queue.then(operation);
    queue = pending.catch(() => {});
    return pending;
  }

  async function append(section, entries, operation) {
    if (!thAuthorized()) throw new Error('Sign in to save to the workbook.');
    const at = new Date().toISOString();
    const values = entries.map(([key, value]) =>
      [section, key, JSON.stringify(value), operation, at, crypto.randomUUID()]);
    if (values.some(row => row[2].length > 49000)) throw new Error('The record is too large to save.');
    const row = await thAppendRows(sheet, values, 'RAW');
    if (!row) throw new Error('The workbook did not confirm the save. Refresh before retrying.');
    return values;
  }

  async function recover(section, candidates) {
    if (!candidates.length) return records(await rows(), section);
    return serial(async () => {
      const source = await rows();
      const current = records(source, section);
      const seen = new Set(source.filter(row => row[0] === section)
        .map(row => JSON.stringify([row[1], row[2]])));
      const imports = [...candidates].filter(([key, value]) => !seen.has(JSON.stringify([key, JSON.stringify(value)])));
      if (!imports.length) return current;
      const conflict = imports.some(([key, value]) => current.has(key) &&
        JSON.stringify(current.get(key)) !== JSON.stringify(value));
      const written = await append(section, imports, 'import');
      if (conflict) notice('An older browser copy differs from your saved ' + section +
        ' data. Both versions are in the workbook. The saved version stays active.');
      return records([...source, ...written], section);
    });
  }

  function save(section, entries) {
    return serial(() => append(section, entries, 'save'));
  }

  async function preference(key) {
    const previous = legacy(key);
    const recovered = await recover('Preferences', previous === null ? [] : [[key, previous]]);
    return recovered.get(key) ?? null;
  }

  async function readPreference(key) {
    try { return await preference(key); }
    catch (error) { notice('Could not load a saved preference. ' + error.message); return null; }
  }

  async function writePreference(key, value) {
    try {
      await save('Preferences', [[key, value]]);
      return true;
    } catch (error) {
      notice('Could not save the preference. ' + error.message);
      return false;
    }
  }

  function localRecords(key, fallback) {
    try { return JSON.parse(legacy(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }

  function oldWeighIns(key) {
    const previous = localRecords(key, []);
    if (!Array.isArray(previous)) return [];
    return previous.filter(row => row?.date && Number.isFinite(row.weight)).map(row =>
      [Number.isFinite(row.time) ? 'scale:' + row.time : 'manual:' + row.date, row]);
  }

  async function recoverBrowser() {
    let keys;
    try { keys = Array.from({length:localStorage.length}, (_, index) => localStorage.key(index)); }
    catch { return; }
    const prefKeys = keys.filter(key => /^tiszod-(?:account-view$|file-view:|task-view-v3$|finance-2026-filters$|savings-filters$|last-fuel-(?:vehicle|account)$|reading:|apple-health-drive-source$|(?:education|medical|recreation)-hidden-people$|recreation-todd-hidden-cards$)/.test(key || ''));
    const groups = [
      ['Preferences', prefKeys.map(key => [key, legacy(key)])],
      ['Medical weigh-ins', keys.filter(key => /^tiszod-medical-review-v1:[\w-]+:weigh-ins$/.test(key || '')).flatMap(oldWeighIns)],
      ['Garage deferrals', Object.entries(localRecords('tiszod-garage-report-deferrals', {}))],
      ['Garage recall results', Object.entries(localRecords('tiszod-garage-report-recalls', {}))],
      ['Pet reminders', ['dismissed', 'cleared'].map(kind => 'thbudget-pet-reminder-' + kind)
        .filter(key => keys.includes(key)).map(key => [key, legacy(key)])]
    ];
    for (const [section, values] of groups) {
      if (values.length) await recover(section, values);
    }
    for (const [key, spec] of Object.entries(window.FUEL_LEGACY || {})) {
      if (keys.includes(spec.storage)) await window.thHistoricalFuel.load(key, spec.entries, spec.storage);
    }
  }

  return {legacy, notice, oldWeighIns, recover, recoverBrowser, save, readPreference, writePreference};
})();
