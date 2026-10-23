window.blackMildCodes = [
  { added: '2026-09-29', code: '76V-LC6-L3R-KMV', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-09-29', code: '43J-JST-GF6-R52', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-09-29', code: '3L2-49H-MMJ-97B', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-09-29', code: 'L6P-RHJ-J9L-VCV', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-09-29', code: 'F7G-HK2-WC8-M97', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-10-16', code: 'BN5-353-9NF-K9T', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-10-16', code: '62S-977-N26-ZXR', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-10-23', code: '4K9-CVX-SSX-VT4', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-10-23', code: 'X9H-F7F-269-Z65', source: 'Photo', status: 'Unredeemed' }
];

// This worksheet uses its bundled code list, not the Google Sheet API. The
// shared portal shell still includes the login overlay, so clear it after this
// page's static data has loaded.
document.getElementById('th-auth')?.setAttribute('hidden', '');
