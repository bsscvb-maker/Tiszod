'use strict';

{
  const get = id => document.getElementById(id);
  const scopes = [...document.querySelectorAll('[data-work-scope]')];
  const priorityLabels = { tier1: 'High', tier2: 'Medium', tier3: 'Low' };
  const intakePriorities = { High: 'tier1', Medium: 'tier2', Low: 'tier3' };
  const sharedStates = { ready: 'Not started', working: 'In progress', waiting: 'Waiting', done: 'Completed' };
  const intakeStates = ['Needs review', 'Open', 'Done', 'Dismissed'];
  let scope = 'active';
  let intake = [];
  let intakeError = '';
  let intakeLoading = false;
  let scanRunning = false;
  const savingTasks = new Set();
  let intakeRevision = 0;
  let intakeWrites = 0;
  let renderedRows = '';

  function make(tag, text, className) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function service() {
    if (window.parent === window || !window.parent.taskIntake) return null;
    return window.parent.taskIntake;
  }

  function addedLabel(value) {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Date unavailable' : noteStamp(date);
  }

  const addedDate = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York', month:'short', day:'numeric', year:'numeric'});
  const addedTime = new Intl.DateTimeFormat('en-US', {timeZone:'America/New_York', hour:'numeric', minute:'2-digit'});

  function addedColumns(value) {
    const date = new Date(value);
    if (!value || Number.isNaN(date.getTime())) return ['—', '—'];
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return [addedDate.format(new Date(value + 'T12:00:00Z')), '—'];
    return [addedDate.format(date), addedTime.format(date)];
  }

  function sharedItems() {
    return tasks.map(task => {
      const details = meta(task);
      const status = statusOf(task);
      const reviewChoice = details.reviewChoice || (details.needsReview === false ? 'Accepted' : 'Needs review');
      return {
        title: task.text, notes: details.notes, added: task.createdAt, project: details.project,
        updates: details.updates || [],
        priority: tierOf(task), due: details.due, status: sharedStates[status],
        complete: status === 'done', review: reviewChoice === 'Needs review', reviewChoice, company: details.company, task
      };
    });
  }

  function inScope(item, filter = scope) {
    if (item.status === 'Dismissed') return false;
    if (filter === 'complete') return item.complete;
    if (item.complete) return false;
    if (filter === 'review') return item.review;
    if (filter === 'overdue') return Boolean(item.due && item.due < dateKey());
    return true;
  }

  function category(item) {
    if (item.project) return item.project;
    if (/return|refund|return label/i.test(item.title)) return 'Returns';
    if (/\bdog\b|honey|millie|lilly|lily|vaccine|vaccinat|veterinar|\bpet\b/i.test(item.title)) return 'Pets';
    if (/interview|recruiter|resume|job application|career|employment|\bAmazon\b.*\bpreparation call\b/i.test(item.title)) return 'Career';
    if (/\bfapt\b|school|eligibility|release forms|iep/i.test(item.title)) return 'School paperwork';
    if (/registration|vehicle|mustang|4runner|oil change|tire|wiper|motorcycle|\bram\b/i.test(item.title)) return 'Vehicles';
    if (/hotel|travel|room|flight|reservation/i.test(item.title)) return 'Travel';
    if (/appointment|doctor|medical|prescription/i.test(item.title)) return 'Appointments';
    if (/bill|payment|utility|reconcil|transaction|ledger|budget/i.test(item.title)) return 'Finance';
    if (item.source === 'Board minutes') return 'Board business';
    if (item.source === 'Portal check') return 'Portal maintenance';
    return 'Personal follow-up';
  }

  function compare(a, b) {
    const sort = get('workSort').value;
    if (sort === 'category') return category(a).localeCompare(category(b)) || a.title.localeCompare(b.title);
    if (sort === 'title') return a.title.localeCompare(b.title);
    const byDue = (a.due || '9999').localeCompare(b.due || '9999');
    if (sort === 'due') return byDue || a.title.localeCompare(b.title);
    const addedAt = item => new Date(item.added || 0).getTime() || 0;
    return addedAt(b) - addedAt(a);
  }

  function renderWork() {
    const items = [...sharedItems(), ...intake];
    const counts = Object.fromEntries(scopes.map(button => {
      const filter = button.dataset.workScope;
      return [filter, items.filter(item => inScope(item, filter)).length];
    }));
    get('workSummary').textContent = busy && !ready ? 'Loading tasks…'
      : counts.active + ' active · ' + counts.review + ' need review';
    get('workNew').disabled = busy || !ready;
    get('workRefresh').disabled = busy || intakeLoading || scanRunning;
    get('workRefresh').textContent = scanRunning ? 'Checking email…' : 'Refresh';
    for (const button of scopes) {
      const filter = button.dataset.workScope;
      button.setAttribute('aria-pressed', String(filter === scope));
      button.querySelector('span').textContent = counts[filter];
    }

    const query = get('workSearch').value.trim().toLowerCase();
    const priority = get('workPriority').value;
    const visible = items.filter(item => inScope(item)
      && (!priority || item.priority === priority)
      && [item.title, item.notes, category(item)].filter(Boolean).join(' ').toLowerCase().includes(query)
    ).sort(compare);

    const results = get('workResults');
    const rowsKey = JSON.stringify(visible.length ? [visible, items.map(category)] : [busy || intakeLoading]);
    if (rowsKey === renderedRows) return;
    renderedRows = rowsKey;
    results.replaceChildren();
    if (!visible.length) {
      const message = busy || intakeLoading ? 'Loading tasks…' : 'No tasks match this view.';
      results.append(make('p', message, 'work-empty'));
      return;
    }
    const heading = make('div', '', 'work-column-head');
    for (const label of ['Date added', 'Time', 'Task description', 'Company', 'Category', 'Due date', 'Priority', 'Review', 'Done']) {
      heading.append(make('span', label));
    }
    results.append(heading);
    const availableCategories = [...new Set([
      'Appointments', 'Board business', 'Career', 'Finance', 'Personal follow-up', 'Pets',
      'Portal maintenance', 'Returns', 'School paperwork', 'Travel', 'Uncategorized', 'Vehicles',
      ...items.map(category)
    ])].sort((a,b) => a.localeCompare(b));
    for (const item of visible) results.append(taskRow(item, availableCategories));
  }

  function showError(message) {
    const feedback = get('workFeedback');
    feedback.dataset.tone = 'error';
    feedback.textContent = message;
    feedback.hidden = !message;
  }

  function statusChanged() {
    const message = get('message');
    const error = [message.classList.contains('error') ? message.textContent : '', intakeError].filter(Boolean).join(' ');
    if (error) showError(error);
    else if (get('workFeedback').dataset.tone === 'error') showError('');
    renderWork();
  }

  function destination(item) {
    const labels = { 'President email': 'President inbox', 'Club email': 'BSSC inbox', 'Portal check': 'Administration' };
    if (item.task) {
      const link = meta(item.task).links?.find(value => /^https:\/\//i.test(value));
      return { label: link ? 'Task attachment' : 'Task Tracker', link };
    }
    const source = (labels[item.source] || item.source || 'Task Tracker').replace(/@gmail\.com(?:\s+inbox)?$/i, '').replace(/\s+inbox$/i, '');
    return { label: source, link: item.link };
  }


  async function loadEmailPreview(item, content) {
    content.textContent = 'Loading email preview…';
    content.setAttribute('aria-live', 'polite');
    try {
      const api = service();
      if (!api?.preview) throw Error('Reload the portal to connect email previews.');
      const snapshot = await api.preview(item.id);
      if (!content.isConnected) return;
      if (!snapshot?.messages?.length) throw Error('The email snapshot is not ready yet. It will appear after the next preview sync.');
      content.replaceChildren(make('p', snapshot.mailbox || destination(item).label, 'work-email-mailbox'));
      for (const message of snapshot.messages.slice(0, 5)) {
        const card = make('article', '', 'work-email-card');
        card.append(make('h3', message.subject || '(No subject)'));
        card.append(make('p', [message.sender, message.date].filter(Boolean).join(' · '), 'work-email-meta'));
        card.append(make('div', message.text || 'No readable message text.', 'work-email-text'));
        content.append(card);
      }
      content.append(make('p', 'Saved email snapshot. Links and private identifiers are omitted. Open Gmail for attachments or newer messages.', 'work-email-note'));
    } catch (error) {
      if (content.isConnected) content.textContent = error.message || 'Could not load this email preview. Try again after refreshing.';
    }
  }

  function sourceDetails(item) {
    const details = make('details', '', 'work-source');
    const email = Boolean(item.id && isEmailSource(item));
    details.append(make('summary', email ? 'Email preview' : 'Source details'));
    details.append(make('p', item.source || 'Added in Task Tracker'));
    if (/^https:\/\//i.test(item.link)) {
      const link = make('a', email ? 'Open original in Gmail' : 'Open original');
      link.href = item.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      details.append(link);
    }
    if (email) {
      const content = make('section', '', 'work-email-preview');
      details.append(content);
      details.ontoggle = () => {
        if (!details.open) return;
        details.ontoggle = null;
        void loadEmailPreview(item, content);
      };
      details.open = true;
    }
    return details;
  }

  async function saveIntake(item, status, adjustments = {}) {
    intakeWrites++;
    intakeRevision++;
    try {
      await service().update(item.id, { status, ...adjustments });
      const saved = (await service().read()).find(row => row[0] === item.id);
      if (!saved || (status !== undefined && saved[6] !== status)
        || (adjustments.due !== undefined && (saved[4] || '') !== adjustments.due)
        || (adjustments.priority && saved[8] !== adjustments.priority)
        || (adjustments.category !== undefined && (saved[11] || '') !== adjustments.category)
        || (adjustments.reviewChoice !== undefined && saved[12] !== adjustments.reviewChoice)
        || (adjustments.company !== undefined && saved[13] !== adjustments.company)) {
        throw new Error('The change could not be verified. Refresh and try again.');
      }
      if (adjustments.due !== undefined) item.due = adjustments.due;
      if (adjustments.priority) item.priority = intakePriorities[adjustments.priority];
      if (adjustments.category !== undefined) item.project = adjustments.category;
      if (adjustments.company !== undefined) item.company = adjustments.company;
      if (adjustments.reviewChoice !== undefined) item.reviewChoice = adjustments.reviewChoice;
      item.status = saved[6];
      item.complete = saved[6] === 'Done';
      item.review = item.reviewChoice === 'Needs review';
      renderWork();
      return true;
    } catch (error) {
      showError(error.message);
      return false;
    } finally {
      intakeWrites--;
    }
  }

  function openDetails(item) {
    get('workDetailTitle').textContent = item.title;
    const body = get('workDetailBody');
    body.replaceChildren(make('p', [item.status, addedLabel(item.added), item.due ? dateLabel(item.due) : 'No due date'].join(' · ')));
    body.append(make('p', 'Category: ' + category(item)));
    if (item.notes) body.append(make('p', item.notes));
    if (item.updates?.length) {
      const updates = make('details', '', 'work-source');
      updates.append(make('summary', 'Progress notes (' + item.updates.length + ')'));
      for (const update of [...item.updates].reverse()) {
        updates.append(make('p', noteStamp(update.at) + ' · ' + update.text));
      }
      body.append(updates);
    }
    if (item.task) {
      const edit = make('button', 'Edit task');
      edit.onclick = () => { get('workDetails').close(); open(item.task); };
      const addNote = make('button', 'Add note');
      addNote.onclick = () => { get('workDetails').close(); openNote(item.task); };
      body.append(edit, addNote);
    } else {
      const label = make('label', 'Status ');
      const select = document.createElement('select');
      intakeStates.forEach(state => select.add(new Option(state)));
      select.value = item.status;
      label.append(select);
      const dueLabel = make('label', 'Due date ');
      const due = document.createElement('input');
      due.type = 'date';
      due.value = item.due || '';
      dueLabel.append(due);
      const priorityLabel = make('label', 'Priority ');
      const priority = document.createElement('select');
      Object.keys(intakePriorities).forEach(value => priority.add(new Option(value)));
      priority.value = priorityLabels[item.priority] || 'Medium';
      priorityLabel.append(priority);
      const save = make('button', 'Save changes');
      const feedback = make('p', '', 'work-edit-feedback');
      feedback.setAttribute('role', 'status');
      save.onclick = async () => {
        save.disabled = true;
        if (await saveIntake(item, select.value, { due: due.value, priority: priority.value, reviewChoice: select.value === item.status ? undefined : select.value === 'Needs review' ? 'Needs review' : select.value === 'Open' ? 'Accepted' : undefined })) {
          get('workDetails').close();
        } else {
          feedback.textContent = get('workFeedback').textContent;
          save.disabled = false;
        }
      };
      body.append(label, dueLabel, priorityLabel, save, feedback);
    }
    const complete = make('button', item.complete ? 'Reopen task' : 'Mark complete', 'work-complete');
    complete.type = 'button';
    complete.disabled = item.task ? busy || !ready : !service() || intakeLoading;
    const actions = make('div', '', 'work-detail-actions');
    const completionFeedback = make('p', '');
    completionFeedback.setAttribute('role', 'status');
    complete.onclick = async () => {
      complete.disabled = true;
      if (await completeItem(item)) get('workDetails').close();
      else {
        completionFeedback.textContent = get('workFeedback').textContent;
        complete.disabled = false;
      }
    };
    actions.append(complete, completionFeedback);
    body.append(actions);
    if (item.task) {
      const links = meta(item.task).links;
      if (links?.length) body.append(...links.map(link => sourceDetails({ link, source: 'Task attachment' })));
    } else {
      body.append(sourceDetails(item));
    }
    const dialog = get('workDetails');
    if (!dialog.open) dialog.showModal();
  }

  async function completeItem(item) {
    const key = item.id || item.task.id;
    const wasComplete = item.complete;
    if (savingTasks.has(key)) return;
    savingTasks.add(key);
    renderWork();
    try {
      if (item.task) {
        await updateStatus(item.task, wasComplete ? 'ready' : 'done');
        const saved = tasks.find(task => task.id === item.task.id);
        if (!saved || (statusOf(saved) === 'done') !== !wasComplete) return;
      } else if (!await saveIntake(item, wasComplete ? 'Open' : 'Done')) return;
      const feedback = get('workFeedback');
      feedback.dataset.tone = 'success';
      feedback.textContent = wasComplete ? 'Task reopened. Moved to All active.' : 'Task completed. Moved to Completed.';
      feedback.hidden = false;
      return true;
    } catch (error) {
      showError(error.message);
    } finally {
      savingTasks.delete(key);
      renderWork();
    }
  }

  function rowSelect(item, label, value, options) {
    const select = make('select', '', 'work-row-field work-' + label.toLowerCase());
    select.setAttribute('aria-label', label + ' for ' + item.title);
    for (const [key, name] of options) select.add(new Option(name, key));
    select.value = value;
    return select;
  }

  async function saveRowChanges(item, {category:group, due, priority, review, company}) {
    if (!item.task) {
      return saveIntake(item, review === undefined ? undefined : review === 'Needs review' ? 'Needs review' : 'Open', {category:group, due, priority:priorityLabels[priority], reviewChoice:review, company});
    }
    const task = tasks.find(record => record.id === item.task.id);
    if (!task) throw Error('This task is no longer available.');
    const details = meta(task);
    if (group !== undefined) details.project = group;
    if (due !== undefined) details.due = due;
    if (review !== undefined) { details.reviewChoice = review; details.needsReview = review === 'Needs review'; }
    if (company !== undefined) details.company = company;
    const tier = priority || tierOf(task);
    if (priority) details.priority = priority;
    return persist(tasks.map(record => record === task ? {
      ...record, notes:pack(details), tier:statusOf(task) === 'done' ? 'parked' : tier,
      previousTier:tier, updatedAt:new Date().toISOString()
    } : record));
  }

  function taskRow(item, availableCategories) {
    const row = make('article', '', 'work-row');
    const task = make('div', '', 'work-task');
    const title = make('button', item.title, 'work-title');
    title.type = 'button';
    title.onclick = () => {
      try {
        openDetails(item);
      } catch (error) {
        showError('Could not open task details. ' + error.message);
      }
    };
    task.append(title);
    const [date, time] = addedColumns(item.added);
    const added = make('span', date, 'work-added');
    const clock = make('span', time, 'work-time');
    const group = rowSelect(item, 'Category', category(item), availableCategories.map(name => [name, name]));
    const due = make('input', '', 'work-row-field work-due');
    due.type = 'date';
    due.value = item.due || '';
    due.setAttribute('aria-label', 'Due date for ' + item.title);
    due.classList.toggle('work-late', inScope(item, 'overdue'));
    const priorityOptions = Object.entries(priorityLabels);
    if (item.task && item.priority && !priorityLabels[item.priority]) priorityOptions.push([item.priority, item.priority]);
    if (!item.priority) priorityOptions.unshift(['', '—']);
    const priority = rowSelect(item, 'Priority', item.priority || '', priorityOptions);
    const review = rowSelect(item, 'Review', item.reviewChoice, [
      ['Needs review', 'Needs review'], ['Accepted', 'Accepted'], ['Declined', 'Declined']
    ]);
    review.dataset.state = item.reviewChoice.toLowerCase().replace('needs ', '');
    review.disabled = item.complete;
    const companies = [...new Set(['AbbVie', 'Allergan', 'Amazon', 'BoneShakers Social Club', 'IQVIA', 'Life Protect 24/7', 'Triton Stone', 'Not applicable', item.company].filter(Boolean))];
    const company = rowSelect(item, 'Company', item.company || '', [
      ['', 'Pick company'], ...companies.map(name => [name, name]), ['__other', 'Other…']
    ]);
    company.dataset.unset = String(!item.company);
    const fields = [group, due, priority, review, company];
    async function apply(field, previous, changes) {
      row.setAttribute('aria-busy', 'true');
      fields.forEach(control => { control.disabled = true; });
      checkbox.disabled = true;
      try {
        if (!await saveRowChanges(item, changes)) field.value = previous;
      } catch (error) {
        field.value = previous;
        showError(error.message);
      } finally {
        fields.forEach(control => { control.disabled = control === review && item.complete; });
        checkbox.disabled = false;
        row.removeAttribute('aria-busy');
      }
    }
    group.onchange = () => apply(group, category(item), {category:group.value});
    due.onchange = () => apply(due, item.due || '', {due:due.value});
    priority.onchange = () => apply(priority, item.priority || '', {priority:priority.value});
    review.onchange = () => apply(review, item.reviewChoice, {review:review.value});
    company.onchange = () => {
      const previous = item.company || '';
      const value = company.value === '__other' ? window.prompt('Company name')?.trim() : company.value;
      if (value == null || (company.value === '__other' && !value)) {
        company.value = previous;
        return;
      }
      return apply(company, previous, {company:value});
    };
    const done = make('label', '', 'work-done');
    const checkbox = make('input', '');
    checkbox.type = 'checkbox';
    checkbox.checked = item.complete;
    checkbox.setAttribute('aria-label', (item.complete ? 'Reopen: ' : 'Mark complete: ') + item.title);
    checkbox.onchange = async () => {
      checkbox.disabled = true;
      if (!await completeItem(item)) {
        checkbox.checked = item.complete;
        checkbox.disabled = false;
      }
    };
    done.append(checkbox);
    row.append(added, clock, task, company, group, due, priority, review, done);
    return row;
  }

  const reviewedSuggestions = new Set();

  function offerCompletion() {
    if (document.hidden || document.querySelector('dialog[open]')) return;
    const proposal = intake.find(item => inScope(item, 'active') && item.evidence && !reviewedSuggestions.has(item.id));
    if (!proposal) return;
    reviewedSuggestions.add(proposal.id);
    const dialog = get('workDetails');
    get('workDetailTitle').textContent = 'Confirm task completion';
    const body = get('workDetailBody');
    body.replaceChildren(make('strong', proposal.title), make('p', proposal.evidence));
    if (/^https:\/\//i.test(proposal.evidenceLink)) {
      const link = make('a', 'Open matching record');
      link.href = proposal.evidenceLink;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      body.append(link);
    }
    const later = make('button', 'Keep open');
    later.onclick = () => dialog.close();
    const complete = make('button', 'Confirm complete');
    const feedback = make('p', '');
    feedback.setAttribute('role', 'status');
    complete.onclick = async () => {
      complete.disabled = true;
      if (await saveIntake(proposal, 'Done')) dialog.close();
      else {
        feedback.textContent = get('workFeedback').textContent;
        complete.disabled = false;
      }
    };
    body.append(complete, later, feedback);
    dialog.showModal();
  }

  async function refreshIntake() {
    const api = service();
    if (!api?.ready() || intakeLoading || intakeWrites) return;
    const revision = intakeRevision;
    intakeLoading = true;
    renderWork();
    try {
      const rows = await api.read();
      if (revision !== intakeRevision) return;
      const unique = new Map();
      for (const [id, source, title, , due, link, status, added, priority, evidence, evidenceLink, project, decision, company] of rows) {
        if (!id || !title || unique.has(id)) continue;
        const reviewChoice = decision || (status === 'Open' || status === 'Done' ? 'Accepted' : 'Needs review');
        unique.set(id, {id, source, title, added, due, link, status, project, company, evidence, evidenceLink,
          priority:intakePriorities[priority] || 'tier3', reviewChoice, review:reviewChoice === 'Needs review', complete:status === 'Done'});

      }
      intake = [...unique.values()];
      intakeError = '';
    } catch (error) {
      intakeError = 'Could not load incoming tasks. ' + error.message;
    } finally {
      intakeLoading = false;
      statusChanged();
      offerCompletion();
    }
  }

  async function refreshWork() {
    if (scanRunning) return;
    const mailbox = get('workMailboxCheck');
    const status = get('workMailboxStatus');
    const report = (message, progress) => {
      status.textContent = message;
      if (progress?.total) mailbox.style.setProperty('--mail-progress', (100 * progress.finished / progress.total) + '%');
    };
    scanRunning = true;
    mailbox.hidden = false;
    mailbox.style.setProperty('--mail-progress', '0%');
    mailbox.dataset.checking = 'true';
    report('Checking email…');
    renderWork();
    try {
      const savedTasks = Promise.allSettled([load(), refreshIntake()]);
      if (!window.requestTaskEmailCheck) throw Error('Email checking is unavailable. Reload the portal and try again.');
      const result = await window.requestTaskEmailCheck(report);
      if (result.complete) mailbox.style.setProperty('--mail-progress', '100%');
      report(result.message);
      await savedTasks;
      await refreshIntake();
    } catch (error) {
      report(error.message || 'Could not check email.');
    } finally {
      scanRunning = false;
      mailbox.dataset.checking = 'false';
      renderWork();
    }
  }
  get('workRefresh').onclick = refreshWork;
  get('workNew').onclick = () => open();
  get('workClose').onclick = () => get('workDetails').close();
  get('workSearch').oninput = renderWork;
  get('workPriority').onchange = renderWork;
  get('workSort').onchange = renderWork;
  for (const button of scopes) {
    button.onclick = () => { scope = button.dataset.workScope; renderWork(); };
  }

  new MutationObserver(statusChanged).observe(get('message'), { attributes: true, childList: true, subtree: true });
  render = () => { fillOptions(); renderWork(); };
  get('legacyTracker').hidden = true;
  get('workDashboard').hidden = false;
  if (window.parent !== window) {
    document.documentElement.classList.add('tracker-embedded');
    get('workDashboard').querySelector('h1').textContent = 'Work queue';
  }
  renderWork();
  refreshIntake();
  if (window.parent !== window) {
    window.parent.addEventListener('tiszod-task-intake-ready', refreshIntake);
    window.parent.addEventListener('tiszod-drive-books-connected', refreshIntake);
    window.addEventListener('pagehide', () => {
      window.parent.removeEventListener('tiszod-task-intake-ready', refreshIntake);
      window.parent.removeEventListener('tiszod-drive-books-connected', refreshIntake);
    });
    window.setInterval(() => { if (!document.hidden) refreshIntake(); }, 60000);
    get('workDetails').addEventListener('close', offerCompletion);
  }
}
