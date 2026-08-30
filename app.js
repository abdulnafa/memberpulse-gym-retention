(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const state = {
    view: 'dashboard',
    memberFilter: 'all',
    sortDescending: true,
    toastTimer: null
  };

  const views = $$('.app-view');
  const navItems = $$('.nav-item[data-view]');
  const sidebar = $('#sidebar');
  const sidebarOverlay = $('#sidebarOverlay');
  const overlay = $('#modalOverlay');
  const messageDrawer = $('#messageDrawer');
  const renewalModal = $('#renewalModal');
  const memberSearch = $('#memberSearch');
  const tableBody = $('#memberTableBody');
  const memberRows = $$('#memberTableBody tr');

  function routeFor(view) {
    return view === 'dashboard' ? '#overview' : view === 'members' ? '#members' : '#member/nina-patel';
  }

  function viewFromHash() {
    if (location.hash.startsWith('#member/')) return 'profile';
    if (location.hash === '#members') return 'members';
    return 'dashboard';
  }

  function showView(view, updateHash = true) {
    state.view = view;
    views.forEach(section => section.classList.toggle('active', section.dataset.screen === view));
    navItems.forEach(item => item.classList.toggle('active', item.dataset.view === view));
    if (updateHash && location.hash !== routeFor(view)) history.pushState(null, '', routeFor(view));
    document.title = `${view === 'dashboard' ? 'Overview' : view === 'members' ? 'Members' : 'Nina Patel'} — MemberPulse`;
    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navItems.forEach(item => item.addEventListener('click', () => showView(item.dataset.view)));
  $$('[data-view-link]').forEach(item => item.addEventListener('click', () => showView(item.dataset.viewLink)));
  window.addEventListener('popstate', () => showView(viewFromHash(), false));

  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.style.display = 'block';
    requestAnimationFrame(() => sidebarOverlay.classList.add('visible'));
    document.body.classList.add('no-scroll');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('visible');
    window.setTimeout(() => { if (!sidebarOverlay.classList.contains('visible')) sidebarOverlay.style.display = ''; }, 220);
    if (!messageDrawer.classList.contains('open') && !renewalModal.classList.contains('open')) document.body.classList.remove('no-scroll');
  }

  $('#menuButton').addEventListener('click', openSidebar);
  $('#sidebarClose').addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  function applyMemberFilter(filter = state.memberFilter) {
    state.memberFilter = filter;
    const query = memberSearch.value.trim().toLowerCase();
    let visible = 0;

    memberRows.forEach(row => {
      const matchesFilter = filter === 'all' || row.dataset.status.split(' ').includes(filter);
      const matchesSearch = !query || row.dataset.name.includes(query) || row.textContent.toLowerCase().includes(query);
      const shouldShow = matchesFilter && matchesSearch;
      row.hidden = !shouldShow;
      if (shouldShow) visible += 1;
    });

    $$('.member-tabs button').forEach(tab => tab.classList.toggle('active', tab.dataset.filter === filter));
    $('#visibleRows').textContent = visible;
    $('#memberEmpty').classList.toggle('visible', visible === 0);
    tableBody.style.display = visible === 0 ? 'none' : '';
  }

  $$('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      showView('members');
      applyMemberFilter(button.dataset.filter);
    });
  });

  $$('[data-go-members]').forEach(button => {
    button.addEventListener('click', () => {
      showView('members');
      applyMemberFilter(button.dataset.goMembers);
    });
  });

  memberSearch.addEventListener('input', () => applyMemberFilter());

  $('#sortButton').addEventListener('click', () => {
    state.sortDescending = !state.sortDescending;
    const sorted = [...memberRows].sort((a, b) => {
      const delta = Number(b.dataset.score) - Number(a.dataset.score);
      return state.sortDescending ? delta : -delta;
    });
    sorted.forEach(row => tableBody.appendChild(row));
    $('#sortButton').childNodes[1].nodeValue = state.sortDescending ? 'Risk: High to low' : 'Risk: Low to high';
    showToast('Members sorted', state.sortDescending ? 'Highest-risk members are shown first.' : 'Lowest-risk members are shown first.');
  });

  $('#filterButton').addEventListener('click', () => showToast('Filters ready', 'Filter by coach, plan, join date, or membership value.'));

  function updateSelection() {
    const selected = $$('.row-checkbox:checked').length;
    $('#selectedCount').textContent = selected;
    $('#bulkBar').classList.toggle('visible', selected > 0);
    $('#selectAll').checked = selected > 0 && selected === $$('.row-checkbox:not(:disabled)').length;
    $('#selectAll').indeterminate = selected > 0 && selected < $$('.row-checkbox:not(:disabled)').length;
  }

  $$('.row-checkbox').forEach(box => box.addEventListener('change', updateSelection));
  $('#selectAll').addEventListener('change', event => {
    $$('.row-checkbox').forEach(box => {
      if (!box.closest('tr').hidden) box.checked = event.target.checked;
    });
    updateSelection();
  });
  $('#clearSelection').addEventListener('click', () => {
    $$('.row-checkbox, #selectAll').forEach(box => { box.checked = false; box.indeterminate = false; });
    updateSelection();
  });

  $$('[data-profile]').forEach(item => {
    item.addEventListener('click', event => {
      if (event.target.closest('button, label, input')) return;
      showView('profile');
    });
  });
  $$('[data-open-profile]').forEach(item => item.addEventListener('click', () => showView('profile')));

  function syncOverlay() {
    const hasOpenLayer = messageDrawer.classList.contains('open') || renewalModal.classList.contains('open');
    overlay.classList.toggle('visible', hasOpenLayer);
    document.body.classList.toggle('no-scroll', hasOpenLayer);
  }

  function openDrawer() {
    renewalModal.classList.remove('open');
    renewalModal.setAttribute('aria-hidden', 'true');
    messageDrawer.classList.add('open');
    messageDrawer.setAttribute('aria-hidden', 'false');
    syncOverlay();
    window.setTimeout(() => $('.drawer-close', messageDrawer).focus(), 250);
  }

  function closeDrawer() {
    messageDrawer.classList.remove('open');
    messageDrawer.setAttribute('aria-hidden', 'true');
    syncOverlay();
  }

  function openRenewal() {
    messageDrawer.classList.remove('open');
    messageDrawer.setAttribute('aria-hidden', 'true');
    renewalModal.classList.add('open');
    renewalModal.setAttribute('aria-hidden', 'false');
    syncOverlay();
    window.setTimeout(() => $('.modal-close', renewalModal).focus(), 220);
  }

  function closeRenewal() {
    renewalModal.classList.remove('open');
    renewalModal.setAttribute('aria-hidden', 'true');
    syncOverlay();
  }

  $$('.drawer-close').forEach(button => button.addEventListener('click', closeDrawer));
  $$('.modal-close').forEach(button => button.addEventListener('click', closeRenewal));
  overlay.addEventListener('click', () => { closeDrawer(); closeRenewal(); });
  $('#openRenewal').addEventListener('click', openRenewal);
  $('#sideRenewalButton').addEventListener('click', openRenewal);
  $('#useRecommendation').addEventListener('click', openDrawer);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeDrawer();
      closeRenewal();
      closeSidebar();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      showView('members');
      memberSearch.focus();
    }
  });

  $$('.table-action').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    openDrawer();
  }));

  $$('.channel-tabs button').forEach(button => button.addEventListener('click', () => {
    $$('.channel-tabs button').forEach(tab => tab.classList.toggle('active', tab === button));
    const labels = { whatsapp: 'Send WhatsApp', sms: 'Send SMS', email: 'Send email' };
    $('#sendMessage').lastChild.textContent = labels[button.dataset.channel];
  }));

  const messageTemplates = {
    personal: 'Hi Nina, it’s Jordan from Apex Fitness 👋 We haven’t seen you for a little while and wanted to check that everything’s okay. Your membership is also due on Sep 3 — I’ve included a quick renewal link below so you can keep your current rate. Let me know if I can help with anything!',
    renewal: 'Hi Nina, a quick reminder that your Apex Fitness membership ends on Sep 3. You can renew your Core Monthly plan securely using the link below. We’d love to keep you with us!',
    inactive: 'Hi Nina, it’s Jordan from Apex Fitness. We’ve missed seeing you at the gym lately and wanted to check in. Is there anything we can do to help you get back into your routine?'
  };

  function updateCharCount() {
    const length = $('#messageBody').value.length;
    $('#charCount').textContent = `${length} character${length === 1 ? '' : 's'}`;
  }

  $('#messageTemplate').addEventListener('change', event => {
    $('#messageBody').value = messageTemplates[event.target.value];
    updateCharCount();
  });
  $('#messageBody').addEventListener('input', updateCharCount);
  updateCharCount();

  $('.compose-footer button').addEventListener('click', () => {
    $('#messageBody').value = messageTemplates.personal.replace('Hi Nina,', 'Hi Nina — hope you’re doing well!');
    updateCharCount();
    showToast('Message refined', 'The tone is now warmer and more personal.');
  });

  $('#sendMessage').addEventListener('click', () => {
    const channel = $('.channel-tabs button.active').dataset.channel;
    const label = channel === 'whatsapp' ? 'WhatsApp' : channel === 'sms' ? 'SMS' : 'Email';
    const button = $('#sendMessage');
    const original = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Sending…';
    window.setTimeout(() => {
      button.disabled = false;
      button.innerHTML = original;
      closeDrawer();
      showToast(`${label} sent to Nina`, 'Follow-up logged and reminder status updated.');
    }, 650);
  });

  $('#offerToggle').addEventListener('change', event => $('#offerField').classList.toggle('visible', event.target.checked));

  $('#createLink').addEventListener('click', () => {
    const button = $('#createLink');
    const original = button.innerHTML;
    button.disabled = true;
    button.textContent = 'Creating secure link…';
    window.setTimeout(() => {
      button.disabled = false;
      button.innerHTML = original;
      closeRenewal();
      showToast('Renewal link sent', 'Nina received a secure $59 renewal link via WhatsApp.');
    }, 750);
  });

  let toastTimer;
  function showToast(title, message) {
    window.clearTimeout(toastTimer);
    $('#toastTitle').textContent = title;
    $('#toastMessage').textContent = message;
    $('#toast').classList.add('visible');
    toastTimer = window.setTimeout(() => $('#toast').classList.remove('visible'), 4200);
  }
  $('#toastClose').addEventListener('click', () => $('#toast').classList.remove('visible'));

  $$('[data-action]').forEach(button => button.addEventListener('click', event => {
    const action = button.dataset.action;
    if (action === 'remind' || action === 'send-bulk') {
      event.stopPropagation();
      openDrawer();
      return;
    }
    const feedback = {
      'add-member': ['Member form ready', 'New member onboarding can be completed in one flow.'],
      callbacks: ['5 callbacks scheduled', 'The next callback is today at 11:30 AM.'],
      unopened: ['3 links need attention', 'A personalized second reminder is recommended.'],
      call: ['Calling Nina Patel', 'Opening the saved member phone number.'],
      whatsapp: ['WhatsApp ready', 'Nina’s personalized follow-up is ready to review.'],
      email: ['Email draft created', 'A renewal email has been prepared for Nina.'],
      reschedule: ['Follow-up rescheduled', 'Choose a new time from the complete scheduling flow.'],
      contacted: ['Nina marked as contacted', 'The activity timeline and owner tasks were updated.'],
      'change-plan': ['Plan options ready', 'Compare upgrades, discounts, and retention offers.'],
      'add-note': ['New note ready', 'Coach notes remain visible to the whole retention team.']
    };
    if (action === 'whatsapp' || action === 'email') openDrawer();
    else if (feedback[action]) showToast(...feedback[action]);
  }));

  $$('[data-member-name]').forEach(row => row.addEventListener('click', () => {
    showToast(`${row.dataset.memberName} selected`, 'A complete member profile would open in the full product.');
  }));

  $('.global-search').addEventListener('click', () => {
    showView('members');
    window.setTimeout(() => memberSearch.focus(), 50);
  });

  $$('.chart-range button').forEach(button => button.addEventListener('click', () => {
    $$('.chart-range button').forEach(item => item.classList.toggle('active', item === button));
    const chartData = {
      4: ['1,386', '8.4%'],
      12: ['3,842', '6.2%'],
      26: ['8,921', '4.8%']
    };
    $('#checkinsValue').textContent = chartData[button.dataset.range][0];
    $('#checkinsTrend').textContent = chartData[button.dataset.range][1];
    $('#activityChart').animate([{ opacity: .35 }, { opacity: 1 }], { duration: 280, easing: 'ease-out' });
  }));

  showView(viewFromHash(), false);
  applyMemberFilter('all');
})();
