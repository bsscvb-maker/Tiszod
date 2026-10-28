window.blackMildCodes = [
  { added: '2026-09-29', code: '76V-LC6-L3R-KMV', source: 'Photo', status: 'Submitted' },
  { added: '2026-09-29', code: '43JJ-STGF-6R52', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-09-29', code: '3L2-49H-MMJ-97B', source: 'Photo', status: 'Submitted' },
  { added: '2026-09-29', code: 'L6PR-HJJ9-LVCV', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-09-29', code: 'F7GH-K2WC-8M97', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-10-16', code: 'BN53-539N-FK9T', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-10-16', code: '62S9-77N2-6ZXR', source: 'Photo', status: 'Unredeemed' },
  { added: '2026-10-23', code: '4K9-CVX-SSX-VT4', source: 'Photo', status: 'Submitted' },
  { added: '2026-10-23', code: 'X9H-F7F-269-Z65', source: 'Photo', status: 'Submitted' },
  { added: '2026-10-28', code: 'CZ6-870-N7T-JMZ', source: 'Photo', status: 'Unredeemed' }
];

// This worksheet uses its bundled code list, not the Google Sheet API. The
// shared portal shell still includes the login overlay, so clear it after this
// page's static data has loaded.
document.getElementById('th-auth')?.setAttribute('hidden', '');
