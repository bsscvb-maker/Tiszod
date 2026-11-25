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
    if (!Number.isFinite(value)) return result('neutral', entry.value ? 'Recorded' : 'No reading');
    if (type === 'RestingHeartRate') {
      return result(value >= 60 && value <= 100 ? 'green' : 'amber',
        value < 60 ? 'Below range' : value > 100 ? 'Above range' : 'In range', 'Resting: 60–100 bpm');
    }
    if (type === 'HeartRate') return result('neutral', 'Activity unknown');
    if (type === 'OxygenSaturation') {
      if (value <= 0 || value > 100) return result('neutral', 'Invalid reading');
      if (value <= 88 && /^(?:finger|fingertip) pulse oximeter$/i.test(entry.source || '')) {
        return result('red', 'Very low', 'Finger pulse oximeter');
      }
      return result(value >= 95 ? 'green' : 'amber', value >= 95 ? 'In typical range' : 'Recheck',
        /apple|watch/i.test(entry.source || '') ? '95–100% · Wellness' : 'Typical: 95–100%');
    }
    if (type === 'BodyMassIndex') {
      const category = value < 18.5 ? 'Underweight' : value < 25 ? 'In range' : value < 30 ? 'Overweight' : 'Obesity range';
      return result(value >= 18.5 && value < 25 ? 'green' : 'amber', category, 'CDC healthy range: 18.5–24.9');
    }
    // Compare with a configured goal when one is available.
    if (entry.goal && Number.isFinite(entry.goal.min)) {
      const {min,max = Infinity} = entry.goal;
      return result(value >= min && value <= max ? 'green' : 'neutral',
        value >= min && value <= max ? 'Goal met' : max === Infinity ? 'In progress' : 'Outside goal',
        max === Infinity ? 'Goal: ' + display(min) : 'Goal: ' + min + '–' + max + (entry.unit ? ' ' + entry.unit : ''));
    }

    const prior = Array.from(history).filter(row => typeOf(row.type) === type && row.time < entry.time &&
      row.unit === entry.unit && row.source === entry.source && row.kind === entry.kind &&
      Number.isFinite(valueOf(row)) && (entry.kind !== 'Daily total' || easternDay.format(row.time) !== easternDay.format(entry.time)));
    if (!prior.length) return result('neutral', 'Recorded', 'No earlier comparable reading');
    if (type === 'BodyMass') {
      const first = prior.reduce((oldest,row) => row.time < oldest.time ? row : oldest);
      const delta = value - valueOf(first);
      return result('neutral', delta === 0 ? 'No change' : (delta < 0 ? '↓ ' : '↑ ') + display(Math.abs(delta)) + (entry.unit ? ' ' + entry.unit : ''),
        'Since ' + easternDay.format(first.time));
    }
    const average = prior.reduce((sum,row) => sum + valueOf(row), 0) / prior.length;
    const roundedValue = Math.round(value * 100), roundedAverage = Math.round(average * 100);
    return result('neutral', roundedValue === roundedAverage ? 'At your average' : roundedValue > roundedAverage ? 'Above your average' : 'Below your average',
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
  window.thMedicalMetricStatus = {badge, compare, typeOf, valueOf};
})();
