/* Use the same saved pressure label on cards and in Garage Reports. */
function garagePressureLabel(specs) {
  const read = value => {
    const text = String(value ?? '').trim();
    return /^\d+(?:\.\d+)?$/.test(text) ? text : text.match(/^(\d+(?:\.\d+)?)\s*(?:psi|lbs?)\b/i)?.[1];
  };
  const general = String(specs.tirePsi ?? '').trim();
  if (/^solid tires\b/i.test(general)) return 'Solid tires';
  const front = read(specs.frontTirePsi);
  const rear = read(specs.rearTirePsi);
  const towing = String(specs.frontTirePsi ?? '').match(/\/\s*(\d+(?:\.\d+)?)\s*PSI.*tow/i)?.[1];
  if (front && rear && towing)
    return front + ' PSI normal · Heavy towing: ' + towing + ' front / ' + rear + ' rear PSI';
  if (front && rear && front !== rear) return front + ' front / ' + rear + ' rear PSI';
  if (front && rear) return front + ' PSI';
  const saved = read(general);
  if (front || rear) return (front ? 'Front ' + front : 'Rear ' + rear) + ' PSI';
  return saved ? saved + ' PSI' : '';
}
