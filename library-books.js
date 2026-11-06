/* The Library book collection uses the same private records as Education. */
(() => {
  function owner(data) {
    const name = String(data.person || '').trim().toLowerCase();
    if (name === 'aiden') return 'Aiden';
    if (name === 'alexis' || name === 'alexa') return 'Alexis';
    if (name === 'tracy') return 'Tracy';
    return 'Todd';
  }

  function isBook(data) {
    return data.category === 'Books' && owner(data) === 'Todd';
  }

  async function readRecords() {
    const rows = await thValues("'Education Records'!A1:B2000", 'UNFORMATTED_VALUE');
    if (rows[0]?.[0] !== 'ID') throw new Error('Document records could not load.');
    return rows.slice(1).flatMap(([id, value], i) => {
      if (!id) return [];
      try {
        const data = JSON.parse(value || '{}');
        return data && typeof data === 'object' && !Array.isArray(data) ? [{id, row: i + 2, data}] : [];
      } catch {
        return [];
      }
    });
  }

  function isCareer(data) {
    return data.category === 'Career' && owner(data) === 'Todd';
  }

  window.thLibraryBooks = {owner, isBook, isCareer, readRecords};
})();
