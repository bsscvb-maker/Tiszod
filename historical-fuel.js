/* Workbook-backed changes to the historical fuel logs. */
window.thHistoricalFuel = (() => {
  'use strict';
  const identity = entry => entry.date + '|' + entry.odo;
  const section = key => 'Historical fuel: ' + key;

  function normalize(row) {
    return {
      date: row.date ?? row.d, odo: row.odo ?? row.o, gallons: row.gallons ?? row.g,
      price: row.price ?? row.p, total: row.total ?? row.t,
      full: row.full || (row.partial ? 'no' : 'yes'), flag: Boolean(row.flag),
      notes: row.notes || '', city: row.city || 0, time: row.time || ''
    };
  }

  function index(rows) {
    return new Map(rows.filter(row => row && typeof row === 'object').map(normalize)
      .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && Number.isFinite(row.odo) && row.gallons > 0)
      .map(row => [identity(row), row]));
  }

  function changes(before, after) {
    const result = [];
    for (const [id, value] of after) {
      if (JSON.stringify(before.get(id)) !== JSON.stringify(value)) result.push([id, value]);
    }
    for (const id of before.keys()) {
      if (!after.has(id)) result.push([id, null]);
    }
    return result;
  }

  async function load(key, original, storage) {
    const seed = index(original);
    let previous = null;
    try { previous = JSON.parse(thSaved.legacy(storage) || 'null'); } catch {}
    const recovered = Array.isArray(previous) ? changes(seed, index(previous)) : [];
    const overlay = await thSaved.recover(section(key), recovered);
    const entries = new Map(seed);
    for (const [id, row] of overlay) {
      if (row === null) entries.delete(id);
      else entries.set(id, row);
    }
    return {entries, overlay};
  }

  async function save(key, before, proposed, original, storage) {
    const updates = changes(before, index(proposed));
    if (!updates.length) return before;
    const {entries} = await load(key, original, storage);
    if (updates.some(([id]) => JSON.stringify(entries.get(id)) !== JSON.stringify(before.get(id)))) {
      throw Error('This entry changed in another browser. Reload the page before editing it again.');
    }
    await thSaved.save(section(key), updates);
    for (const [id, row] of updates) {
      if (row === null) entries.delete(id);
      else entries.set(id, row);
    }
    return entries;
  }

  return {identity, load, save};
})();

window.connectHistoricalFuelPage = (key, original, storage, compact, update) => {
  let baseline, busy = false;
  const status = document.getElementById('historical-fuel-status');
  const main = document.querySelector('main');
  const displayed = entries => [...entries.values()].map(row => compact ? {
    d:row.date, o:row.odo, g:row.gallons, p:row.price, t:row.total,
    partial:row.full === 'no', flag:row.flag, notes:row.notes, city:row.city, time:row.time
  } : row);

  window.addEventListener('storage', event => {
    if (event.key === 'thbudget-session-photos-v1' && !event.newValue) {
      baseline = undefined;
      main.hidden = true;
    }
  });
  window.thStart = async () => {
    const {entries} = await thHistoricalFuel.load(key, original, storage);
    baseline = entries;
    update(displayed(entries));
    main.hidden = false;
    status.textContent = 'Connected to your private workbook.';
  };
  return async proposed => {
    if (!baseline || busy) return false;
    busy = true;
    main.setAttribute('inert', '');
    status.textContent = 'Saving…';
    try {
      baseline = await thHistoricalFuel.save(key, baseline, proposed, original, storage);
      update(displayed(baseline));
      status.textContent = 'Saved to your workbook.';
      return true;
    } catch (error) {
      update(displayed(baseline));
      status.textContent = 'Save failed. ' + error.message;
      return false;
    } finally {
      busy = false;
      main.removeAttribute('inert');
    }
  };
};
