(() => {
  const number = value => value == null || String(value).trim() === '' ? NaN : Number(value);
  const typeOf = type => String(type || '')
    .replace(/^HK(?:Quantity|Category|Correlation|Characteristic|Data|Series)TypeIdentifier/, '')
    .replace(/^BloodOxygenSaturation$/, 'OxygenSaturation');
  const easternDay = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/New_York', dateStyle:'short'});
  const display = value => value.toLocaleString('en-US', {maximumFractionDigits:2});
  const result = (tone, label, detail = '') => ({tone,label,detail});
  const valueOf = entry => {
    const value = number(entry.value);
    return typeOf(entry.type) === 'OxygenSaturation' && value > 0 && value <= 1 ? value * 100 : value;
  };

  function compare(entry, history = []) {
    const type = typeOf(entry.type);
    const value = valueOf(entry);
    if (!Number.isFinite(value)) return result('amber', entry.value ? 'Recorded' : 'No reading');
    if (type === 'RestingHeartRate') {
      return result(value >= 60 && value <= 100 ? 'green' : 'amber',
        value < 60 ? 'Below range' : value > 100 ? 'Above range' : 'Within range', 'Resting: 60–100 bpm');
    }
    if (type === 'OxygenSaturation') {
      if (value <= 0 || value > 100) return result('amber', 'Invalid reading');
      if (value <= 88 && /^(?:finger|fingertip) pulse oximeter$/i.test(entry.source || '')) {
        return result('red', 'Very low', 'Finger pulse oximeter');
      }
      return result(value >= 95 ? 'green' : 'amber', value >= 95 ? 'In typical range' : 'Recheck',
        /apple|watch/i.test(entry.source || '') ? '95–100% · Wellness' : 'Typical: 95–100%');
    }
    if (type === 'BodyMassIndex') {
      const category = value < 18.5 ? 'Underweight' : value < 25 ? 'Within range' : value < 30 ? 'Overweight' : 'Obesity range';
      return result(value >= 18.5 && value < 25 ? 'green' : 'red', category, 'CDC healthy range: 18.5–24.9');
    }
    // Compare with a configured goal when one is available.
    if (type !== 'BodyMass' && entry.goal && Number.isFinite(entry.goal.min)) {
      const {min,max = Infinity} = entry.goal;
      return result(value >= min && value <= max ? 'green' : 'amber',
        value >= min && value <= max ? 'Goal met' : max === Infinity ? 'In progress' : 'Outside goal',
        max === Infinity ? 'Goal: ' + display(min) : 'Goal: ' + min + '–' + max + (entry.unit ? ' ' + entry.unit : ''));
    }

    const unitOf = row => /^(bpm|count\/min)$/i.test(row.unit) ? 'bpm' : row.unit;
    const prior = Array.from(history).filter(row => typeOf(row.type) === type && row.time < entry.time &&
      unitOf(row) === unitOf(entry) && row.source === entry.source && row.kind === entry.kind &&
      Number.isFinite(valueOf(row)) && (entry.kind !== 'Daily total' || easternDay.format(row.time) !== easternDay.format(entry.time)));
    if (type === 'BodyMass') {
      const first = prior.reduce((oldest,row) => !oldest || row.time < oldest.time ? row : oldest, null);
      const delta = first ? value - valueOf(first) : 0;
      const change = first && delta !== 0
        ? (delta < 0 ? '↓ ' : '↑ ') + display(Math.abs(delta)) + ' ' + entry.unit + ' since ' + (first.date?.length === 10 ? first.date : easternDay.format(first.time))
        : '';
      if (entry.goal) {
        const {min,max} = entry.goal;
        const distance = amount => Math.max(min - amount, amount - max, 0);
        const within = distance(value) === 0;
        const progress = first && distance(value) < distance(valueOf(first));
        return result(within || progress ? 'green' : 'amber',
          within ? 'Goal met' : progress ? 'Toward goal' : 'Outside goal',
          [change, 'Goal: ' + min + '–' + max + ' ' + entry.unit].filter(Boolean).join(' · '));
      }
      return result('amber', delta < 0 ? 'Weight down' : delta > 0 ? 'Weight up' : 'Recorded', change);
    }
    if (!prior.length) return result('amber', 'Recorded', 'No earlier comparable reading');
    const average = prior.reduce((sum,row) => sum + valueOf(row), 0) / prior.length;
    if (type === 'HeartRate') {
      const {low,high} = prior.reduce(({low,high},row) => ({
        low:Math.min(low,valueOf(row)), high:Math.max(high,valueOf(row))
      }), {low:Infinity,high:-Infinity});
      const usual = value >= low && value <= high;
      return result(usual ? 'green' : 'amber',
        usual ? 'Within range' : value < low ? 'Below range' : 'Above range',
        'Saved: ' + (low === high ? display(low) : display(low) + '–' + display(high)) + ' bpm · Avg ' + display(average));
    }
    const roundedValue = Math.round(value * 100), roundedAverage = Math.round(average * 100);
    const favorable = (type === 'BodyFatPercentage' && roundedValue < roundedAverage) ||
      (type === 'Muscle' && roundedValue > roundedAverage);
    return result(favorable || roundedValue === roundedAverage ? 'green' : 'amber', roundedValue === roundedAverage ? 'Average' : roundedValue > roundedAverage ? 'Above average' : 'Below average',
      'Saved avg: ' + display(average) + (entry.unit === '%' ? '%' : entry.unit ? ' ' + entry.unit : ''));
  }

  function badge(status) {
    const group = document.createElement('div');
    group.className = 'medical-metric-status';
    const label = document.createElement('span');
    label.className = 'medical-status-badge';
    label.dataset.tone = status.tone;
    label.textContent = status.label;
    group.append(label);
    if (status.detail) {
      const detail = document.createElement('span');
      detail.className = 'medical-status-detail';
      detail.textContent = status.detail;
      group.append(detail);
    }
    return group;
  }
  function trend(current, previous, basis) {
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
    const rounded = value => Math.round(value * 10);
    const change = rounded(current) - rounded(previous);
    const [symbol, label] = change > 0 ? ['↗', 'Up'] : change < 0 ? ['↘', 'Down'] : ['→', 'Steady'];
    const arrow = document.createElement('span');
    arrow.className = 'medical-trend-arrow';
    arrow.title = label + ' ' + basis;
    arrow.setAttribute('role', 'img');
    arrow.setAttribute('aria-label', arrow.title);
    arrow.textContent = symbol;
    return arrow;
  }

  window.thMedicalMetricStatus = {badge, compare, trend, typeOf, valueOf};
})();
