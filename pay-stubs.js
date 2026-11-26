'use strict';

window.thStart = async () => {
  const root = {id:'1lbiirIAvOS6K8e7IV9o8fPIauUNuUG4t'};
  const status = document.getElementById('pay-status');
  const grid = document.getElementById('pay-folders');
  try {
    const [entries, dates] = await Promise.all([
      thDriveRecords.children(root),
      thValues("'Portal Employment Dates'!A1:B100").catch(() => [])
    ]);
    window.thCareerEmploymentDates = new Map(dates.slice(1));
    const nameFor = name => name === 'AbbVie US LLC' ? 'AbbVie' : name;
    const orderFor = name => employerOrder.get(nameFor(name)) ?? Infinity;
    const folders = entries.filter(entry => entry.folder);
    folders.sort((a,b) => orderFor(a.name) - orderFor(b.name) || a.name.localeCompare(b.name));
    grid.parentElement.querySelector('.career-show-hidden')?.remove();
    const addVisibility = thDriveRecords.employerVisibility(grid.parentElement, grid);
    const cards = folders.map(folder => {
      const name = nameFor(folder.name);
      const record = {
        ...folder,
        name,
        driveAction:true,
        coverPath:['Employers', name],
        coverFor:path => employerCovers.get(path.join('/')),
        virtualFiles:async () => (await thDriveRecords.children(folder))
          .filter(file => file.mime === 'application/pdf')
          .sort((a,b) => b.name.localeCompare(a.name))
      };
      const card = thDriveRecords.card(record);
      addVisibility(record, card);
      return card;
    });
    grid.replaceChildren(...cards);
    status.textContent = folders.length ? '' : 'No employer folders are available.';
    void thDriveRecords.restoreNavigation();
  } catch {
    status.textContent = 'Could not load employer folders. Refresh to try again.';
  }
};
