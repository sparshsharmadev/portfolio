(function () {
  'use strict';

  // ── Terminal Gate ─────────────────────────────────────────────────────────
  const termGate = document.getElementById('terminal-gate');
  const termOutput = document.getElementById('admin-term-output');
  const termPrompt = document.getElementById('admin-term-prompt');
  const termInput = document.getElementById('admin-term-input');

  const pinGate = document.getElementById('pin-gate');
  const adminWrap = document.getElementById('admin-wrap');
  const pinInput = document.getElementById('pin-input');
  const pinBtn = document.getElementById('pin-btn');
  const pinErr = document.getElementById('pin-err');

  let termState = 'idle'; // idle -> user -> pass

  // PIN logic
  const _k = [24,19,26,30,24,26,24,28];
  const _pin = () => _k.map(c => String.fromCharCode(c ^ 42)).join('');

  // Hotkey: Ctrl+Alt+X on admin page re-opens terminal if not yet auth'd
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'x') {
      if (sessionStorage.getItem('admin-auth') !== '1') {
        termGate.style.display = 'flex';
        termInput.focus();
      }
    }
  });

  if (sessionStorage.getItem('admin-auth') === '1') {
    termGate.style.display = 'none';
    pinGate.style.display = 'none';
    // Re-auth with Google silently if already have session
    const waitForAuth = setInterval(() => {
      if (window._auth) {
        clearInterval(waitForAuth);
        
        let hasInitialized = false;
        window._auth.onAuthStateChanged(user => {
          if (user && user.email === 'sparshsharmadev@gmail.com') {
            adminWrap.classList.add('visible');
            initAdmin();
          } else {
            // Give Firebase a brief moment to restore persistent session from IndexedDB
            if (!hasInitialized) {
              hasInitialized = true;
              setTimeout(() => {
                if (!window._auth.currentUser) {
                  sessionStorage.removeItem('admin-auth');
                  termGate.style.display = 'flex';
                  termInput.focus();
                }
              }, 1500);
            } else {
              // Truly logged out or wrong account
              sessionStorage.removeItem('admin-auth');
              termGate.style.display = 'flex';
              termInput.focus();
            }
          }
        });
      }
    }, 50);
  }

  function printLine(text, isInput = false) {
    const div = document.createElement('div');
    div.className = 'term-line';
    if (isInput) {
      div.textContent = termPrompt.textContent + ' ' + text;
    } else {
      div.innerHTML = text;
    }
    termOutput.appendChild(div);
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  termInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const val = termInput.value.trim();
      printLine(termState === 'pass' ? '*'.repeat(val.length) : val, true);
      termInput.value = '';

      if (termState === 'idle') {
        if (val.toLowerCase() === 'admin') {
          termState = 'user';
          termPrompt.textContent = 'username:';
        } else {
          printLine('zsh: command not found: ' + val + '. Access denied.');
        }
      } else if (termState === 'user') {
        if (val.toLowerCase() === 'sparsh') {
          termState = 'pass';
          termPrompt.textContent = 'password:';
          termInput.type = 'password';
        } else {
          termState = 'idle';
          termPrompt.textContent = 'guest@sparsh-dev:~$';
          printLine('<span style="color:var(--red)">Authentication failure. Wrong username.</span>');
        }
      } else if (termState === 'pass') {
        termInput.type = 'text';
        if (val === atob('bWlsa2Nha2UyNzA2IQ==')) {
          printLine('<span style="color:var(--cyan)">Authentication successful. Decrypting payload...</span>');
          setTimeout(() => {
            termGate.style.display = 'none';
            pinGate.style.display = 'flex';
            pinInput.focus();
          }, 800);
        } else {
          termState = 'idle';
          termPrompt.textContent = 'guest@sparsh-dev:~$';
          printLine('<span style="color:var(--red)">Authentication failure. Wrong password.</span>');
        }
      }
    }
  });

  // ── PIN Gate ───────────────────────────────────────────────────────────────
  pinBtn.addEventListener('click', checkPin);
  pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkPin(); });

  function checkPin() {
    if (pinInput.value === _pin()) {
      pinErr.textContent = 'Authenticating...';
      // Silently log in using Firebase Email/Password Auth to secure Firestore
      window._auth.signInWithEmailAndPassword(atob('c3BhcnNoc2hhcm1hZGV2QGdtYWlsLmNvbQ=='), atob('bWlsa2Nha2UyNzA2IQ==')).then((result) => {
        if (result.user && result.user.email === atob('c3BhcnNoc2hhcm1hZGV2QGdtYWlsLmNvbQ==')) {
          pinErr.textContent = '';
          pinInput.value = '';
          pinGate.style.display = 'none';
          sessionStorage.setItem('admin-auth', '1');
          // Reload the page to ensure Firebase Auth and Firestore tokens are fully synced
          // The top-level onAuthStateChanged listener will handle initializing the admin dash.
          window.location.reload();
        } else {
          window._auth.signOut();
          pinErr.textContent = 'Unauthorized account.';
          pinInput.value = '';
        }
      }).catch((err) => {
        pinErr.textContent = 'Backend Auth failed: ' + err.message;
        pinInput.value = '';
        console.error(err);
      });
    } else {
      pinErr.textContent = 'Incorrect PIN.';
      pinInput.value = '';
      pinInput.focus();
      setTimeout(() => { pinErr.textContent = ''; }, 2000);
    }
  }

  // ── Firebase ───────────────────────────────────────────────────────────────
  function initAdmin() {
    const db = window._db;
    if (!db) return;

    // Live clock
    setInterval(() => {
      document.getElementById('admin-time').textContent =
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }, 1000);

    // ── Availability Control ─────────────────────────────────────────────────
    let currentAvail = 'available';

    db.collection('portfolio-config').doc('availability').get().then(snap => {
      if (snap.exists) setAvailUI(snap.data().status);
    }).catch(() => {});

    document.querySelectorAll('.avail-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.dataset.status;
        const msg = document.getElementById('avail-custom-msg')?.value || (status === 'available' ? 'Available for projects' : 'Currently booked');
        db.collection('portfolio-config').doc('availability').set({
          status,
          message: msg,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => setAvailUI(status)).catch(() => {});
      });
    });

    function setAvailUI(status) {
      currentAvail = status;
      document.querySelectorAll('.avail-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.status === status);
      });
    }

    // ── Real-time Requests ───────────────────────────────────────────────────
    let allRequests = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let previousCount = 0;

    db.collection('portfolio-requests').onSnapshot(snap => {
      allRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sort client-side to ensure legacy requests without 'createdAt' are still displayed
      allRequests.sort((a, b) => {
        const timeA = a.createdAt && typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt && typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
      
      updateStats();
      renderRequests();

      // New request notification
      if (allRequests.length > previousCount && previousCount > 0) {
        const newest = allRequests[0];
        showNotif(`New inquiry from ${newest.name} — ${newest.projectType}`);
        if (Notification.permission === 'granted') {
          new Notification('New Project Inquiry', {
            body: `${newest.name} — ${newest.projectType} (${newest.budget})`,
          });
        }
      }
      previousCount = allRequests.length;
    }, err => {
      console.error(err);
      document.getElementById('empty-state').textContent = 'Error: ' + err.message;
    });

    // Request browser notification permission
    if (Notification.permission === 'default') {
      setTimeout(() => Notification.requestPermission(), 3000);
    }

    // ── Stats ────────────────────────────────────────────────────────────────
    function updateStats() {
      const total = allRequests.length;
      const newCount = allRequests.filter(r => r.status === 'new').length;
      const active = allRequests.filter(r => ['reviewing','in_discussion','accepted'].includes(r.status)).length;

      document.getElementById('stat-total').textContent = total;
      document.getElementById('stat-new').textContent = newCount;
      document.getElementById('stat-active').textContent = active;

      const newBadge = document.getElementById('new-count');
      newBadge.textContent = newCount > 0 ? `${newCount} new` : '';
      document.title = newCount > 0 ? `(${newCount}) Admin — sparsh.dev` : 'Admin — sparsh.dev';

      // Pipeline: sum budget midpoints of accepted/in_discussion (excludes pro_bono)
      const budgetMap = { 'Under $200': 100, '$200–$500': 350, '$500–$1K': 750, '$1K–$3K': 2000, '$3K+': 3500, 'Flexible': 0 };
      const pipeline = allRequests
        .filter(r => ['in_discussion','accepted'].includes(r.status) && r.status !== 'pro_bono')
        .reduce((sum, r) => sum + (budgetMap[r.budget] || 0), 0);
      document.getElementById('stat-pipeline').textContent = pipeline > 0 ? '$' + pipeline.toLocaleString() : '—';
    }

    // ── Filters & Search ─────────────────────────────────────────────────────
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderRequests();
      });
    });

    document.getElementById('search-input').addEventListener('input', e => {
      searchQuery = e.target.value.toLowerCase();
      renderRequests();
    });

    // ── Render ────────────────────────────────────────────────────────────────
    function renderRequests() {
      const grid = document.getElementById('requests-grid');
      let filtered = allRequests.filter(r => {
        if (activeFilter !== 'all' && r.status !== activeFilter) return false;
        if (searchQuery && !`${r.name} ${r.email} ${r.projectType}`.toLowerCase().includes(searchQuery)) return false;
        return true;
      });

      if (filtered.length === 0) {
        grid.innerHTML = `<div class="empty-state">No requests match this filter.</div>`;
        return;
      }

      grid.innerHTML = filtered.map(r => buildCard(r)).join('');

      // Attach card events
      grid.querySelectorAll('.req-head').forEach(head => {
        head.addEventListener('click', () => head.closest('.req-card').classList.toggle('open'));
      });

      grid.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', e => {
          const id = sel.dataset.id;
          db.collection('portfolio-requests').doc(id).update({
            status: sel.value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }).catch(() => {});
        });
      });

      grid.querySelectorAll('.save-notes-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const notes = document.getElementById('notes-' + id)?.value || '';
          db.collection('portfolio-requests').doc(id).update({ adminNotes: notes })
            .then(() => showNotif('Notes saved'))
            .catch(() => {});
        });
      });

      grid.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(btn.dataset.copy).catch(() => {});
          showNotif('Copied to clipboard');
        });
      });

      grid.querySelectorAll('.gen-proposal-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          const req = allRequests.find(r => r.id === id);
          if (!req) return;
          btn.textContent = 'Generating...';
          btn.disabled = true;
          try {
            const res = await fetch('/api/proposal', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ inquiry: req })
            });
            const data = await res.json();
            const box = document.getElementById('proposal-' + id);
            if (box && data.proposal) {
              box.textContent = data.proposal;
              box.style.display = 'block';
            }
          } catch (_) { showNotif('Proposal generation failed'); }
          btn.textContent = 'Generate Proposal';
          btn.disabled = false;
        });
      });

      grid.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (confirm('Are you absolutely sure you want to permanently delete this request? This action cannot be undone.')) {
            db.collection('portfolio-requests').doc(btn.dataset.id).delete()
              .then(() => showNotif('Request deleted'))
              .catch(() => alert('Delete failed. Unauthorized.'));
          }
        });
      });
    }

    function buildCard(r) {
      const date = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('en-IN') : '—';
      const statusOpts = ['new','reviewing','in_discussion','accepted','declined','completed','pro_bono']
        .map(s => `<option value="${s}" ${r.status===s?'selected':''}>${s === 'pro_bono' ? '🤝 pro bono' : s.replace('_',' ')}</option>`).join('');

      return `
      <div class="req-card status-${r.status}" data-id="${r.id}">
        <div class="req-head">
          <div class="req-client">
            <div class="req-name">${esc(r.name)}${r.company ? ` <span style="color:var(--t3);font-size:.78rem">/ ${esc(r.company)}</span>` : ''}</div>
            <div class="req-email">${esc(r.email)}</div>
          </div>
          <span class="req-type-tag">${esc(r.projectType)}</span>
          <span class="req-budget">${esc(r.budget)}</span>
          <span class="req-date">${date}</span>
          <span class="req-status st-${r.status}">${r.status.replace('_',' ')}</span>
          <span class="req-expand">▾</span>
        </div>
        <div class="req-body">
          ${r.aiSummary ? `<div class="req-ai-summary"><div class="req-ai-label">✦ AI Summary</div>${esc(r.aiSummary)}</div>` : ''}
          <p class="req-desc">${esc(r.description)}</p>
          <div class="req-meta-row">
            <div class="req-meta-item"><div class="req-meta-key">Timeline</div><div class="req-meta-val">${esc(r.timeline)}</div></div>
            <div class="req-meta-item"><div class="req-meta-key">AI Estimate</div><div class="req-meta-val">${r.aiEstimate || '—'}</div></div>
            ${r.referral ? `<div class="req-meta-item"><div class="req-meta-key">Found via</div><div class="req-meta-val">${esc(r.referral)}</div></div>` : ''}
            ${r.references ? `<div class="req-meta-item"><div class="req-meta-key">References</div><div class="req-meta-val" style="word-break:break-all">${esc(r.references)}</div></div>` : ''}
          </div>
          <div class="req-tid">Tracking ID: ${r.trackingId}</div>
          <div class="req-actions" style="margin-top:1rem">
            <select class="action-btn status-select" data-id="${r.id}">${statusOpts}</select>
            <a class="action-btn" href="mailto:${r.email}?subject=Re: Your project inquiry — ${r.projectType}">Reply via email</a>
            <button class="action-btn copy-btn" data-copy="${r.email}">Copy email</button>
            <button class="action-btn gen-proposal-btn" data-id="${r.id}">Generate Proposal</button>
          </div>
          <textarea class="req-notes" id="notes-${r.id}" placeholder="Private notes...">${r.adminNotes || ''}</textarea>
          <div style="display:flex; gap:8px; margin-top:.5rem;">
            <button class="action-btn save-notes-btn" data-id="${r.id}">Save notes</button>
            <button class="action-btn delete-btn" data-id="${r.id}" style="color: #ff4444; border-color: rgba(255,68,68,0.2);">Delete Request</button>
          </div>
          <div class="proposal-box" id="proposal-${r.id}" style="display:none"></div>
        </div>
      </div>`;
    }

    function esc(str) {
      return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    // ── Notification Banner ──────────────────────────────────────────────────
    function showNotif(msg) {
      const banner = document.getElementById('notif-banner');
      banner.textContent = msg;
      banner.classList.add('show');
      setTimeout(() => banner.classList.remove('show'), 3000);
    }
  }

})();
