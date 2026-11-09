(() => {
  const dashboard = document.getElementById('medical-dashboard');
  const panel = document.getElementById('medical-apple-health');
  const scannerSlot = panel.querySelector('.medical-apple-scanner');
  const status = panel.querySelector('[role="status"]');
  const dialog = panel.querySelector('.medical-apple-dialog');
  const link = dashboard.querySelector('a[href="#medical-apple-health"]');
  const groups = [
    ['Heart & Breathing', /Heart|Oxygen|Respiratory|VO2|BloodPressure|ECG|Electrocardiogram|Atrial/i],
    ['Body Composition', /BodyMass|BodyFat|Height|LeanBody|BodyWater|BoneMass|Waist|BodyTemperature/i],
    ['Sleep', /Sleep|WristTemperature/i],
    ['Activity & Mobility', /Step|Distance|ActiveEnergy|BasalEnergy|Exercise|Stand|Move|Walking|Running|Stair|Cycling|Swimming|Mobility|Flights|Wheelchair|PhysicalEffort/i],
    ['Nutrition & Hydration', /Dietary|Nutrition|WaterIntake/i],
    ['Other Apple Health Records', /./]
  ];
  const categoryStyles = ['heart','body','sleep','activity','nutrition','workouts'];
  const highlights = [
    ['HeartRate','RestingHeartRate','OxygenSaturation','HeartRateVariabilitySDNN','RespiratoryRate','VO2Max'],
    ['Height','BodyMass','BodyMassIndex','BodyFatPercentage','Muscle','BodyWaterPercentage','BoneMass'],
    ['SleepAnalysis','AppleSleepingWristTemperature','AppleSleepDurationGoal'],
    ['StepCount','DistanceWalkingRunning','ActiveEnergyBurned','AppleExerciseTime','FlightsClimbed'],
    ['DietaryWater','DietaryEnergyConsumed','DietaryProtein','DietaryCarbohydrates','DietaryFatTotal','DietaryFiber']
  ];
  const knownLabels = {
    HeartRate:'Heart Rate', RestingHeartRate:'Resting Heart Rate', OxygenSaturation:'Blood Oxygen',
    HeartRateVariabilitySDNN:'Heart Rate Variability (SDNN)', DietaryWater:'Water Intake',
    AppleSleepingWristTemperature:'Sleeping Wrist Temperature', BodyTemperature:'Body Temperature',
    BodyWaterPercentage:'Body-Water Percentage', BodyMass:'Weight', BodyMassIndex:'BMI'
  };
  let readPrivate, privateRead, scanner, scannerHome, savedVitals = [], scaleReadings = [];
  let imported = null, error = false;
  const make = (tag, text) => {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    return node;
  };
  const parseDate = date => new Date(String(date ?? '').replace(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/, '$1T$2$3:$4'
  ));
  const displayDate = (date, compact = false) => {
    if (!date) return 'Date unavailable';
    const parsed = parseDate(date);
    if (!Number.isFinite(parsed.getTime())) return String(date);
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(date);
    return new Intl.DateTimeFormat('en-US', dateOnly
      ? {dateStyle:'medium',timeZone:'UTC'}
      : {dateStyle:'medium',...(compact ? {} : {timeStyle:'short'}),timeZone:'America/New_York'}).format(parsed);
  };
  const exportTypes = {
    blood_oxygen: 'OxygenSaturation',
    oxygen_saturation: 'OxygenSaturation',
    heart_rate_variability: 'HeartRateVariabilitySDNN',
    heart_rate_variability_sdnn: 'HeartRateVariabilitySDNN',
    weight_body_mass: 'BodyMass',
    walking_running_distance: 'DistanceWalkingRunning'
  };
  const metricType = name => exportTypes[name] || name.split('_').map(word => word[0]?.toUpperCase() + word.slice(1)).join('');
  function summarize(exports) {
    const latest = new Map();
    for (const file of exports) {
      if (!Array.isArray(file?.data?.metrics)) throw Error('Unrecognized Health Auto Export metrics file.');
      for (const metric of file.data.metrics) {
        if (typeof metric?.name !== 'string' || !Array.isArray(metric.data)) continue;
        const type = metricType(metric.name);
        for (const sample of metric.data) {
          const date = sample?.date || sample?.start;
          const time = Date.parse(String(date).replace(/(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})/, '$1T$2$3:$4'));
          if (!Number.isFinite(time) || time <= (latest.get(type)?.time ?? -Infinity)) continue;
          const pressure = Number.isFinite(sample.systolic) && Number.isFinite(sample.diastolic);
          const amount = sample.qty ?? sample.Avg ?? sample.totalSleep;
          const value = pressure ? sample.systolic + '/' + sample.diastolic : sample.value ?? amount;
          const details = [
            ['Duration', sample.value != null ? sample.qty : undefined, metric.units],
            ['Minimum', sample.Min, metric.units],
            ['Maximum', sample.Max, metric.units],
            ['Meal timing', sample.mealTime],
            ['Food', sample.foodType]
          ].filter(([, detail]) => detail != null).map(([label, value, unit]) => ({label, value, unit}));
          if (value == null) {
            for (const [label, count] of Object.entries(sample)) {
              if (Number.isFinite(count)) details.push({label, value: count, unit: metric.units});
            }
            if (!details.length) continue;
          }
          latest.set(type, {type, date, time, value, details, source: sample.source,
            unit: sample.value == null ? metric.units : '',
            kind: type === 'SleepAnalysis' && sample.value != null ? 'Sleep segment' : 'Latest sample'});
        }
      }
    }
    return {metrics: [...latest.values()], exportCount: exports.length};
  }
  const shortType = type => String(type || '').replace(/^HK(?:Quantity|Category|Correlation|Characteristic|Data|Series)TypeIdentifier/, '');
  const words = text => String(text ?? '').replace(/^HK(?:CategoryValue|WorkoutActivityType)/, '')
    .replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/([A-Z])([A-Z][a-z])/g,'$1 $2');
  function hasValue(value) {
    return typeof value === 'number' ? Number.isFinite(value)
      : typeof value === 'string' && !/^(?:not applicable|not recorded|not available|recorded event|unknown|n\/?a|[-—])?$/i.test(words(value).trim());
  }
  const metricDetail = entry => entry.details?.find(detail => hasValue(detail.value) &&
    (Number.isFinite(detail.value) || (detail.unit && Number.isFinite(Number(detail.value)))));
  const hasReading = entry => hasValue(entry.value) || Boolean(metricDetail(entry));
  const workoutMetric = entry => /stat|metric|summary/i.test(entry.kind || '') ||
    /[·:].*\((?:sum|average|min|max|count)\)/i.test(entry.label || '');
  function tile(entry, compact = false) {
    const card = make('article');
    card.className = 'medical-apple-reading';
    const type = shortType(entry.type);
    const detail = compact && !hasValue(entry.value) ? metricDetail(entry) : null;
    const value = words(detail?.value ?? entry.value).replace(/^Sleep Analysis /,'');
    const unit = /^(Resting)?HeartRate$/.test(type) && entry.unit === 'count/min' ? 'bpm' : (detail?.unit ?? entry.unit);
    const number = Number(value);
    const display = compact && value && Number.isFinite(number)
      ? number.toLocaleString('en-US',{maximumFractionDigits:2}) : value;
    const amount = display ? display + (unit && unit !== 'count' ? (unit === '%' ? '%' : ' ' + unit) : '') : 'Recorded event';
    const label = knownLabels[type] || entry.label || words(type);
    const context = entry.kind === 'Daily total' ? ' · Daily total'
      : type === 'StepCount' ? ' · Latest sample' : '';
    card.append(make('h4', label + (compact ? context : '')), make('strong', detail ? detail.label + ' · ' + amount : amount));
    if (!compact) card.append(make('time',displayDate(entry.date)),
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
  const byLabel = (a,b) => String(a.label || a.type).localeCompare(String(b.label || b.type));
  function openRecords(index, entries, title = groups[index][0] + ' readings', order = byLabel) {
    dialog.dataset.category = categoryStyles[index];
    dialog.querySelector('h3').textContent = title;
    const intro = dialog.querySelector('.medical-apple-detail-intro');
    intro.hidden = index !== 3;
    intro.textContent = index === 3
      ? 'Steps, distance, and exercise minutes describe activity. Walking speed, step length, and stair measurements describe how you move.'
      : '';
    dialog.querySelector('.medical-apple-reading-grid').replaceChildren(
      ...entries.slice().sort(order).map(entry => tile(entry))
    );
    dialog.showModal();
  }
  function overviewHeading(title, count, action, countLabel = 'additional readings') {
    const heading = make('div');
    heading.className = 'medical-apple-overview-heading';
    heading.append(make('h3',title));
    if (action) {
      const button = make('button','Details - ' + count);
      button.type = 'button';
      button.className = 'medical-apple-more';
      button.setAttribute('aria-label', title + ' details, ' + count + ' ' + countLabel);
      button.addEventListener('click',action);
      heading.append(button);
    }
    return heading;
  }
  function render() {
    const rows = Array.isArray(imported?.metrics) ? imported.metrics : [];
    status.hidden = Boolean(imported) && !error;
    status.textContent = error ? 'Could not load the private export. Reopen Apple Health to retry.'
      : imported ? ''
      : privateRead ? 'Loading private Apple Health export…' : 'No private Apple Health export has been imported yet.';
    const workoutRows = rows.filter(row => /^Workout/i.test(row.kind || ''));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 365);
    const recent = workoutRows.map(row => ({row, time: +parseDate(row.date)}))
      .filter(({time}) => time >= +cutoff && time <= Date.now())
      .sort((a,b) => b.time - a.time).map(({row}) => row);
    const sessions = recent.filter(row => !workoutMetric(row));
    const workoutPanel = make('section');
    workoutPanel.className = 'medical-apple-overview';
    workoutPanel.dataset.category = 'workouts';
    workoutPanel.append(overviewHeading('Recent Workouts',recent.length,recent.length
      ? () => openRecords(5,recent,'Recent Workouts', (a,b) => parseDate(b.date) - parseDate(a.date))
      : null, 'workout records'));
    const workouts = make('div');
    workouts.className = 'medical-apple-workout-list';
    for (const row of sessions.slice(0,4)) {
      const item = make('article');
      const duration = row.details?.find(detail => /^duration$/i.test(detail.label));
      const description = duration ? [duration.value,duration.unit].filter(Boolean).join(' ')
        : [row.value,row.unit].filter(value => value != null && value !== '').join(' ');
      item.append(make('strong',row.label || words(shortType(row.type))),make('time',displayDate(row.date,true)));
      if (description) item.append(make('span',description));
      workouts.append(item);
    }
    if (sessions.length) workoutPanel.append(workouts);
    else workoutPanel.append(make('p', recent.length ? 'Recent workout measurements are available in Details.' : imported ? 'No workout records in the past 365 days.' : 'Workout records will appear here when available.'));
    panel.querySelector('.medical-apple-workouts').replaceChildren(workoutPanel);
    const categories = groups.map(([name]) => ({name,entries:[]}));
    for (const row of rows) {
      const type = shortType(row.type);
      if (/^Workout/i.test(row.kind || '') || !hasReading(row)) continue;
      const index = groups.findIndex(([,pattern]) => pattern.test(type));
      categories[index < 0 ? 5 : index].entries.push(row);
    }
    function overview(index) {
      const section = make('section');
      section.className = 'medical-apple-overview';
      section.dataset.category = categoryStyles[index];
      const grid = make('div');
      grid.className = 'medical-apple-summary-grid';
      const entries = (highlights[index] || []).flatMap(type => {
        const matches = categories[index].entries.filter(entry => shortType(entry.type) === type);
        const row = scaleReadings.find(entry => entry.type === type)
          || matches.find(entry => entry.kind === 'Daily total')
          || matches[0] || savedVitals.find(entry => entry.type === type);
        return row && hasReading(row) ? [row] : [];
      });
      const shown = new Set(entries.map(entry => shortType(entry.type)));
      for (const entry of categories[index].entries) {
        const type = shortType(entry.type);
        if (index !== 5 && shown.has(type)) continue;
        entries.push(entry);
        shown.add(type);
      }
      const visible = index === 5 ? entries : entries.slice(0, index === 2 ? 6 : 12);
      grid.append(...visible.map(entry => tile(entry,true)));
      if (!entries.length) grid.append(make('p','No readings available.'));
      const records = categories[index].entries;
      const visibleTypes = new Set(visible.map(entry => shortType(entry.type)));
      const extra = records.filter(entry => !visibleTypes.has(shortType(entry.type))).length;
      section.append(overviewHeading(groups[index][0],index === 5 ? records.length : extra,records.length
        ? () => openRecords(index, records)
        : null, index === 5 ? 'records' : 'additional readings'), grid);
      if (index === 1 && entries.some(entry => entry.source === 'TisZod')) {
        section.append(make('p','TisZod readings shown where available'));
      }
      return section;
    }
    const other = categories[5].entries.length ? [overview(5)] : [];
    panel.querySelector('.medical-apple-left').replaceChildren(overview(0),overview(3),...other);
    panel.querySelector('.medical-apple-right').replaceChildren(overview(1),overview(2),overview(4));
  }
  let loaded = false;
  function route() {
    const active = location.hash === '#medical-apple-health';
    const leaving = !active && dashboard.hasAttribute('data-apple-health');
    if (leaving) loaded = false;
    dashboard.toggleAttribute('data-apple-health', active);
    panel.hidden = !active;
    if (!active && dialog.open) dialog.close();
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
    summarize,
    connect(reader) {readPrivate = reader;loaded = false;route();},
    attachScanner(figure, home, vitals, composition = []) {
      if (scanner && scanner.parentElement === scannerSlot) scanner.remove();
      scanner = figure;
      scannerHome = home;
      savedVitals = vitals;
      scaleReadings = composition;
      route();
      if (!panel.hidden) render();
    }
  };
  route();
})();
