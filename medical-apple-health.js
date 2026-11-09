(() => {
  const dashboard = document.getElementById('medical-dashboard');
  const panel = document.getElementById('medical-apple-health');
  const scannerSlot = panel.querySelector('.medical-apple-scanner');
  const status = panel.querySelector('[role="status"]');
  const link = dashboard.querySelector('a[href="#medical-apple-health"]');
  const groups = [
    ['Heart & Breathing', /Heart|Oxygen|Respiratory|VO2|BloodPressure|ECG|Electrocardiogram|Atrial/i],
    ['Body Composition', /BodyMass|BodyFat|Height|LeanBody|BodyWater|BoneMass|Waist|BodyTemperature/i],
    ['Sleep', /Sleep|WristTemperature/i],
    ['Activity & Mobility', /Step|Distance|ActiveEnergy|BasalEnergy|Exercise|Stand|Move|Walking|Running|Stair|Cycling|Swimming|Mobility|Flights|Wheelchair|PhysicalEffort/i],
    ['Nutrition & Hydration', /Dietary|Nutrition|WaterIntake/i],
    ['Workouts & Other Records', /./]
  ];
  const favorites = ['HeartRate','RestingHeartRate','OxygenSaturation','HeartRateVariabilitySDNN','RespiratoryRate','SleepAnalysis','StepCount','DietaryWater'];
  const knownLabels = {
    HeartRate:'Heart Rate', RestingHeartRate:'Resting Heart Rate', OxygenSaturation:'Blood Oxygen',
    HeartRateVariabilitySDNN:'Heart Rate Variability (SDNN)', DietaryWater:'Water Intake',
    AppleSleepingWristTemperature:'Sleeping Wrist Temperature', BodyTemperature:'Body Temperature',
    BodyWaterPercentage:'Body-Water Percentage', BodyMass:'Weight', BodyMassIndex:'BMI'
  };
  let readPrivate, privateRead, scanner, scannerHome, savedVitals = [];
  let imported = null, error = false;
  const make = (tag, text) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    return node;
  };
  const displayDate = date => {
    if (!date) return 'Date unavailable';
    const iso = String(date).replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/, '$1T$2$3:$4');
    const parsed = new Date(iso);
    if (!Number.isFinite(parsed.getTime())) return String(date);
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
    return new Intl.DateTimeFormat('en-US', dateOnly
      ? {dateStyle:'medium',timeZone:'UTC'}
      : {dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'}).format(parsed);
  };
  const shortType = type => String(type || '').replace(/^HK(?:Quantity|Category|Correlation|Characteristic|Data|Series)TypeIdentifier/, '');
  const words = text => String(text || '').replace(/^HK(?:CategoryValue|WorkoutActivityType)/, '')
    .replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/([A-Z])([A-Z][a-z])/g,'$1 $2');
  function tile(entry, compact = false) {
    const card = make('article');
    card.className = 'medical-apple-reading';
    const type = shortType(entry.type);
    const value = words(entry.value);
    const amount = value ? value + (entry.unit ? (entry.unit === '%' ? '%' : ' ' + entry.unit) : '') : 'Recorded event';
    card.append(make('h4', entry.label || knownLabels[type] || words(type)),
      make('strong', amount), make('time',displayDate(entry.date)),
      make('small', [entry.kind, entry.source].filter(Boolean).join(' · ')));
    if (!compact && Array.isArray(entry.details) && entry.details.length) {
      const list = make('dl');
      for (const detail of entry.details) {
        list.append(make('dt', detail.label),make('dd', String(detail.value) + (detail.unit ? ' ' + detail.unit : '')));
      }
      card.append(list);
    }
    return card;
  }
  function render() {
    const rows = Array.isArray(imported?.metrics) ? imported.metrics : [];
    status.textContent = error ? 'Could not load the private export. Reopen Apple Health to retry.'
      : imported ? 'Private Apple Health export · ' + rows.length + ' metric and event types'
      : privateRead ? 'Loading private Apple Health export…' : 'No private Apple Health export has been imported yet.';
    const summaries = favorites.flatMap(type => {
      const row = rows.find(entry => shortType(entry.type) === type);
      return row ? [row] : savedVitals.filter(entry => entry.type === type);
    });
    const midpoint=Math.ceil(summaries.length/2);
    panel.querySelector('.medical-apple-left').replaceChildren(...summaries.slice(0,midpoint).map(entry => tile(entry,true)));
    panel.querySelector('.medical-apple-right').replaceChildren(...summaries.slice(midpoint).map(entry => tile(entry,true)));
    const openGroups = new Set([...panel.querySelectorAll('.medical-apple-groups details[open]')].map(node => node.dataset.group));
    const categories = groups.map(([name]) => ({name,entries:[]}));
    for (const row of rows) {
      const type = shortType(row.type);
      const index = row.kind.startsWith('Workout') ? 5 : row.kind === 'Daily total' ? 3 : groups.findIndex(([,pattern]) => pattern.test(type));
      categories[Math.max(0,index)].entries.push(row);
    }
    const collections = categories.map(({name,entries}) => {
      const detail = make('details');
      detail.dataset.group = name;
      detail.open = openGroups.has(name);
      detail.append(make('summary', name + ' (' + entries.length + ')'));
      const grid = make('div');
      grid.className = 'medical-apple-reading-grid';
      grid.append(...entries.sort((a,b) => String(a.label || a.type).localeCompare(String(b.label || b.type))).map(entry => tile(entry)));
      if (!entries.length) grid.append(make('p', 'No imported records in this group.'));
      detail.append(grid);
      return detail;
    });
    if (savedVitals.length) {
      const saved = make('details');
      saved.dataset.group = 'tiszod';
      saved.open = openGroups.has('tiszod');
      const grid = make('div');
      grid.className = 'medical-apple-reading-grid';
      grid.append(...savedVitals.map(entry => tile(entry)));
      saved.append(make('summary','Saved TisZod vitals'),grid);
      collections.push(saved);
    }
    panel.querySelector('.medical-apple-groups').replaceChildren(...collections);
  }
  let loaded = false;
  function route() {
    const active = location.hash === '#medical-apple-health';
    const leaving = !active && dashboard.hasAttribute('data-apple-health');
    dashboard.toggleAttribute('data-apple-health', active);
    panel.hidden = !active;
    if (active) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
    if (scanner?.isConnected && scannerHome?.isConnected) {
      scanner.toggleAttribute('data-apple-health-scanner',active);
      if (active && scanner.parentElement !== scannerSlot) scannerSlot.replaceChildren(scanner);
      else if (!active && scanner.parentElement !== scannerHome) scannerHome.append(scanner);
    }
    if (leaving && location.hash) requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView());
    if (active && readPrivate && !loaded && !privateRead) {
      error = false;
      privateRead = Promise.resolve().then(readPrivate).then(result => {
        imported = result;
        loaded = true;
      }).catch(() => {error = true;}).finally(() => {privateRead = null;render();});
      render();
    }
  }
  window.addEventListener('hashchange',route);
  window.thMedicalAppleHealth = {
    connect(reader) {readPrivate = reader;loaded = false;route();},
    attachScanner(figure, home, vitals) {
      if (scanner && scanner.parentElement === scannerSlot) scanner.remove();
      scanner = figure;
      scannerHome = home;
      savedVitals = vitals;
      route();
      if (!panel.hidden) render();
    }
  };
  route();
})();
