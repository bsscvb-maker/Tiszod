(() => {
  const policies = [
    {id:'auto', title:'Auto', description:'Cars and trucks', documents:[
      ['Declarations page','Auto Declarations'], ['Insurance ID cards','Auto ID Cards'], ['Verification of insurance','Auto Verification']
    ]},
    {id:'motorcycle', title:'Motorcycle', description:'2023 Harley-Davidson Road Glide', documents:[
      ['Declarations page','Motorcycle Declarations'], ['Insurance ID card','Motorcycle ID Card']
    ]},
    {id:'camper', title:'Camper', description:'2020 Keystone Bullet', documents:[
      ['Declarations page','Camper Declarations'], ['Verification of insurance','Camper Verification']
    ]}
  ];
  const fileName = key => 'TisZod Insurance - Progressive ' + key + '.pdf';
  const status = document.getElementById('insurance-status');
  const retry = document.getElementById('insurance-retry');
  const output = document.getElementById('insurance-policies');

  async function loadFiles() {
    const names = policies.flatMap(policy => policy.documents.map(([,key]) => fileName(key)));
    const query = "trashed = false and mimeType = 'application/pdf' and 'root' in parents and (" +
      names.map(name => "name = '" + name + "'").join(' or ') + ')';
    const files = new Map();
    let pageToken;
    do {
      const params = new URLSearchParams({q:query,fields:'nextPageToken,files(id,name)',orderBy:'modifiedTime desc'});
      if (pageToken) params.set('pageToken',pageToken);
      const response = await fetch('https://www.googleapis.com/drive/v3/files?' + params, {
        headers:{Authorization:'Bearer ' + thToken}, signal:AbortSignal.timeout(15000)
      });
      if (response.status === 401) {
        thClearSession();
        const error = new Error('Sign in again to view insurance documents.');
        error.status = 401;
        throw error;
      }
      if (!response.ok) throw new Error('Drive could not load the insurance documents.');
      const page = await response.json();
      for (const file of page.files || []) if (!files.has(file.name)) files.set(file.name,file.id);
      pageToken = page.nextPageToken;
    } while (pageToken);
    return files;
  }

  function render(files) {
    for (const policy of policies) {
      const card = document.createElement('section');
      card.className = 'insurance-policy';
      card.id = policy.id;
      const header = document.createElement('header');
      const title = document.createElement('h2');
      const description = document.createElement('p');
      title.textContent = policy.title;
      description.textContent = policy.description;
      header.append(title, description);
      const list = document.createElement('ul');
      for (const [label,key] of policy.documents) {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.textContent = label;
        const id = files.get(fileName(key));
        const action = document.createElement(id ? 'a' : 'span');
        if (id) {
          action.href = 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view';
          action.target = '_blank';
          action.rel = 'noopener noreferrer';
          action.textContent = 'Open PDF ↗';
          action.setAttribute('aria-label', 'Open ' + policy.title + ' ' + label.toLowerCase() + ' in Google Drive');
        } else {
          action.className = 'insurance-missing';
          action.textContent = 'Unavailable';
        }
        item.append(name, action);
        list.append(item);
      }
      card.append(header, list);
      output.append(card);
    }
  }

  window.thStart = async () => {
    retry.hidden = true;
    output.replaceChildren();
    status.textContent = 'Loading insurance documents…';
    try {
      const files = await loadFiles();
      render(files);
      status.textContent = files.size === 7 ? '7 policy documents' :
        files.size + ' of 7 documents available. Sign in with the Google account that holds your insurance files.';
      retry.hidden = files.size === 7;
      const selected = document.getElementById(location.hash.slice(1));
      if (selected?.classList.contains('insurance-policy')) selected.scrollIntoView();
    } catch (error) {
      if (error.status === 401) throw error;
      status.textContent = 'Insurance documents could not load. Try again.';
      retry.hidden = false;
    }
  };
  retry.onclick = () => {
    if (thAuthorized()) window.thStart().catch(() => location.reload());
    else location.reload();
  };
})();
