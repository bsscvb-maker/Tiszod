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

  function sharedItems() {
    return tasks.map(task => {
      const details = meta(task);
      const status = statusOf(task);
      return {
        title: task.text, notes: details.notes, owner: details.owner, project: details.project,
        updates: details.updates || [],
        priority: tierOf(task), due: details.due, status: sharedStates[status],
        complete: status === 'done', review: details.needsReview === true, task
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
    if (item.project && !/^uncategorized$/i.test(item.project)) return item.project;
    if (/return|refund|return label/i.test(item.title)) return 'Returns';
    if (/\bdog\b|honey|millie|lilly|lily|vaccine|vaccinat|veterinar|\bpet\b/i.test(item.title)) return 'Pets';
    if (/interview|recruiter|resume|job application|career|employment/i.test(item.title)) return 'Career';
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
    return Number(inScope(b, 'overdue')) - Number(inScope(a, 'overdue'))
      || Number(b.review) - Number(a.review)
      || (a.priority || 'tier4').localeCompare(b.priority || 'tier4')
      || byDue || a.title.localeCompare(b.title);
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
      && [item.title, item.notes, item.owner, category(item)].filter(Boolean).join(' ').toLowerCase().includes(query)
    ).sort(compare);

    const results = get('workResults');
    results.replaceChildren();
    if (!visible.length) {
      const message = busy || intakeLoading ? 'Loading tasks…' : 'No tasks match this view.';
      results.append(make('p', message, 'work-empty'));
      return;
    }
    const heading = make('div', '', 'work-column-head');
    for (const label of ['Task description', 'Category', 'Owner', 'Where to go', 'Due date', 'Priority', 'Status', '']) {
      heading.append(make('span', label));
    }
    results.append(heading);
    for (const item of visible) results.append(taskRow(item));
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


  let emailPreviewSequence = 0;
  function isEmailSource(item) {
    return /^https:\/\/mail\.google\.com\//i.test(destination(item).link || '');
  }

  async function openEmailPreview(item) {
    const sequence = ++emailPreviewSequence;
    const dialog = get('workDetails');
    get('workDetailTitle').textContent = item.title;
    const body = get('workDetailBody');
    const mailbox = make('p', destination(item).label, 'work-email-mailbox');
    const content = make('section', 'Loading email preview…', 'work-email-preview');
    content.setAttribute('aria-live', 'polite');
    const original = make('a', 'Open original in Gmail', 'work-email-original');
    original.href = destination(item).link;
    original.target = '_blank';
    original.rel = 'noopener noreferrer';
    const controls = make('button', 'Task details');
    controls.type = 'button';
    controls.onclick = () => { emailPreviewSequence++; openDetails(item); };
    body.replaceChildren(mailbox, content, controls, original);
    if (!dialog.open) dialog.showModal();
    try {
      const api = service();
      if (!api?.preview) throw Error('Reload the portal to connect email previews.');
      const snapshot = await api.preview(item.id);
      if (sequence !== emailPreviewSequence || !dialog.open) return;
      if (!snapshot?.messages?.length) throw Error('The email snapshot is not ready yet. It will appear after the next preview sync.');
      mailbox.textContent = snapshot.mailbox || destination(item).label;
      content.replaceChildren();
      for (const message of snapshot.messages.slice(0, 5)) {
        const card = make('article', '', 'work-email-card');
        card.append(make('h3', message.subject || '(No subject)'));
        card.append(make('p', [message.sender, message.date].filter(Boolean).join(' · '), 'work-email-meta'));
        card.append(make('div', message.text || 'No readable message text.', 'work-email-text'));
        content.append(card);
      }
      content.append(make('p', 'Saved email snapshot. Links and private identifiers are omitted. Open Gmail for attachments or newer messages.', 'work-email-note'));
    } catch (error) {
      if (sequence === emailPreviewSequence && dialog.open) content.textContent = error.message || 'Could not load this email preview. Try again after refreshing.';
    }
  }

  function sourceDetails(item) {
    const details = make('details', '', 'work-source');
    details.append(make('summary', 'Source details'));
    details.append(make('p', item.source || 'Added in Task Tracker'));
    if (item.id && isEmailSource(item)) {
      const preview = make('button', 'View email');
      preview.type = 'button';
      preview.onclick = () => openEmailPreview(item);
      details.append(preview);
    }
    if (/^https:\/\//i.test(item.link)) {
      const link = make('a', 'Open original');
      link.href = item.link;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      details.append(link);
    }
    return details;
  }

  async function saveIntake(item, status, adjustments = {}) {
    try {
      await service().update(item.id, { status, ...adjustments });
      const saved = (await service().read()).find(row => row[0] === item.id);
      if (!saved || saved[6] !== status
        || (adjustments.due !== undefined && (saved[4] || '') !== adjustments.due)
        || (adjustments.priority && saved[8] !== adjustments.priority)) {
        throw new Error('The change could not be verified. Refresh and try again.');
      }
      if (adjustments.due !== undefined) item.due = adjustments.due;
      if (adjustments.priority) item.priority = intakePriorities[adjustments.priority];
      item.status = status;
      item.complete = status === 'Done';
      item.review = status === 'Needs review';
      renderWork();
      return true;
    } catch (error) {
      showError(error.message);
      return false;
    }
  }

  function openDetails(item) {
    get('workDetailTitle').textContent = item.title;
    const body = get('workDetailBody');
    body.replaceChildren(make('p', [item.status, item.owner || 'Unassigned', item.due ? dateLabel(item.due) : 'No due date'].join(' · ')));
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
      const complete = make('button', item.complete ? 'Reopen task' : 'Mark complete');
      complete.disabled = busy || !ready;
      complete.onclick = async () => {
        complete.disabled = true;
        await updateStatus(item.task, item.complete ? 'ready' : 'done');
        get('workDetails').close();
      };
      body.append(edit, addNote, complete);
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
        if (await saveIntake(item, select.value, { due: due.value, priority: priority.value })) {
          get('workDetails').close();
        } else {
          feedback.textContent = get('workFeedback').textContent;
          save.disabled = false;
        }
      };
      body.append(label, dueLabel, priorityLabel, save, feedback);
    }
    if (item.task) {
      const links = meta(item.task).links;
      if (links?.length) body.append(...links.map(link => sourceDetails({ link, source: 'Task attachment' })));
    } else {
      body.append(sourceDetails(item));
    }
    get('workDetails').showModal();
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
    } catch (error) {
      showError(error.message);
    } finally {
      savingTasks.delete(key);
      renderWork();
    }
  }

  function taskRow(item) {
    const row = make('article', '', 'work-row');
    const { label, link } = destination(item);
    const linked = /^https:\/\//i.test(link);
    const email = isEmailSource(item);
    const title = make(linked && !email ? 'a' : 'button', item.title, 'work-title');
    if (email) {
      title.type = 'button';
      title.title = 'View email inside Task Tracker';
      title.setAttribute('aria-label', 'View email: ' + item.title);
      title.onclick = () => openEmailPreview(item);
    } else if (linked) {
      title.href = link;
      title.target = '_blank';
      title.rel = 'noopener noreferrer';
      title.title = 'Open original · ' + label;
      title.setAttribute('aria-label', item.title + ' — open original in a new tab');
    } else {
      title.type = 'button';
      title.onclick = () => openDetails(item);
    }
    const group = make('span', category(item), 'work-category');
    const owner = make('span', item.owner || 'Unassigned', 'work-owner');

    const due = make('span', item.due ? dateLabel(item.due) : '—', 'work-due');
    if (inScope(item, 'overdue')) {
      due.classList.add('work-late');
      due.textContent = 'Overdue · ' + due.textContent;
    }
    const priority = make('span', priorityLabels[item.priority] || '—', 'work-priority');
    if (item.priority) priority.dataset.priority = item.priority;
    const status = make('span', item.review && !item.complete ? 'Needs review' : item.status, 'work-state');
    status.dataset.state = item.complete ? 'complete' : item.review ? 'review' : 'active';
    const more = make('button', 'Details', 'work-more');
    more.onclick = () => openDetails(item);

    const where = make(email ? 'button' : linked ? 'a' : 'span', label, 'work-destination');
    if (email) {
      where.type = 'button';
      where.title = 'View email';
      where.onclick = () => openEmailPreview(item);
    } else if (linked) {
      where.href = link;
      where.target = '_blank';
      where.rel = 'noopener noreferrer';
      where.setAttribute('aria-label', label + ' for ' + item.title);
    }
    const statusCell = make('div', '', 'work-status');
    const complete = make('button', item.complete ? 'Reopen' : 'Mark complete', 'work-complete');
    complete.type = 'button';
    complete.setAttribute('aria-label', (item.complete ? 'Reopen ' : 'Mark complete: ') + item.title);
    const saving = savingTasks.has(item.id || item.task.id);
    complete.disabled = saving || (item.task ? busy || !ready : !service() || intakeLoading);
    if (saving) complete.textContent = 'Saving…';
    complete.onclick = () => completeItem(item);
    statusCell.append(status, complete);
    row.append(title, group, owner, where, due, priority, statusCell, more);
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
    if (!api || intakeLoading) return;
    intakeLoading = true;
    renderWork();
    try {
      const rows = await api.read();
      const unique = new Map();
      for (const [id, source, title, owner, due, link, status, , priority, evidence, evidenceLink] of rows) {
        if (!id || !title || unique.has(id)) continue;
        unique.set(id, { id, source, title, owner, due, link, status, evidence, evidenceLink, priority: intakePriorities[priority], review: status === 'Needs review', complete: status === 'Done' });
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
    scanRunning = true;
    renderWork();
    try {
      await Promise.all([load(), refreshIntake()]);
      if (!window.requestTaskEmailCheck) throw Error('Email checking is unavailable. Reload the portal and try again.');
      const report = message => {
        const feedback = get('workFeedback');
        feedback.dataset.tone = 'info';
        feedback.textContent = message;
        feedback.hidden = false;
      };
      report('Requesting an email check…');
      const result = await window.requestTaskEmailCheck(report);
      await refreshIntake();
      report(result.message);
    } catch (error) {
      showError(error.message);
    } finally {
      scanRunning = false;
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
  if (service()) {
    window.setInterval(() => { if (!document.hidden) refreshIntake(); }, 60000);
    window.addEventListener('focus', refreshIntake);
    get('workDetails').addEventListener('close', offerCompletion);
  }
}
