/* ── Portfolio Firebase + Inquiry + Chat + Availability ─────────────────── */
(function () {
  'use strict';

  const db = window._db;
  if (!db) return;

  // ── Availability Status Pill ───────────────────────────────────────────────
  const availDot  = document.getElementById('avail-dot');
  const availText = document.getElementById('avail-text');

  db.collection('portfolio-config').doc('availability').onSnapshot(snap => {
    if (!snap.exists || !availText) return;
    const { status, message } = snap.data();
    // Update text label
    const labels = { available: 'Open to work', limited: 'Limited slots', booked: 'Fully booked' };
    availText.textContent = message || labels[status] || 'Open to work';
    // Update ring color via inline style
    if (availDot) {
      const colors = { available: 'var(--cyan)', limited: '#f59e0b', booked: '#ef4444' };
      availDot.style.borderColor = colors[status] || 'var(--cyan)';
    }
  }, () => {});

  // ── Service Cards → pre-fill project type on click ────────────────────────
  document.querySelectorAll('.svc-cta').forEach(a => {
    a.addEventListener('click', () => {
      const type = a.closest('.svc-card')?.dataset.type;
      if (type) sessionStorage.setItem('preselect-type', type);
    });
  });
  // ── Multi-step Form ───────────────────────────────────────────────────────
  const form = document.getElementById('inquiry-form');
  if (form) {
    let currentStep = 1;
    const formData = { type: '', budget: '', timeline: '' };

    const preselectType = sessionStorage.getItem('preselect-type');
    if (preselectType) {
      sessionStorage.removeItem('preselect-type');
      const target = document.querySelector(`#pill-type .pill[data-val="${preselectType}"]`);
      if (target) { target.classList.add('active'); formData.type = preselectType; }
    }

    function showStep(n) {
      document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
      const target = n === 'confirm' ? 'step-confirm' : 'step-' + n;
      const el = document.getElementById(target);
      if (el) el.classList.add('active');
      document.querySelectorAll('.fstep').forEach(s => {
        const sn = parseInt(s.dataset.step);
        s.classList.toggle('active', sn === n);
        s.classList.toggle('done', sn < n);
      });
      currentStep = n;
    }

    form.querySelectorAll('.form-next').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!validateStep(currentStep)) return;
        showStep(parseInt(btn.dataset.next));
      });
    });
    form.querySelectorAll('.form-back').forEach(btn => {
      btn.addEventListener('click', () => showStep(parseInt(btn.dataset.back)));
    });

    document.querySelectorAll('.pill-select').forEach(group => {
      group.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
          group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          if (group.id === 'pill-type')     formData.type     = pill.dataset.val;
          if (group.id === 'pill-budget')   formData.budget   = pill.dataset.val;
          if (group.id === 'pill-timeline') formData.timeline = pill.dataset.val;
        });
      });
    });

    function validateStep(step) {
      let ok = true;
      if (step === 1) {
        const name = document.getElementById('f-name');
        const email = document.getElementById('f-email');
        const ne = document.getElementById('err-name');
        const ee = document.getElementById('err-email');
        if (ne) {
          if (!name.value.trim()) { ne.textContent = 'Name is required'; ok = false; } else ne.textContent = '';
        }
        if (ee) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { ee.textContent = 'Valid email required'; ok = false; } else ee.textContent = '';
        }
      }
      if (step === 2) {
        const te = document.getElementById('err-type');
        const de = document.getElementById('err-desc');
        const desc = document.getElementById('f-desc');
        if (te) {
          if (!formData.type) { te.textContent = 'Select a project type'; ok = false; } else te.textContent = '';
        }
        if (de) {
          if (desc.value.trim().length < 20) { de.textContent = 'Min 20 chars please'; ok = false; } else de.textContent = '';
        }
      }
      if (step === 3) {
        const be = document.getElementById('err-budget');
        const te = document.getElementById('err-timeline');
        if (be) {
          if (!formData.budget)   { be.textContent = 'Select a budget range'; ok = false; } else be.textContent = '';
        }
        if (te) {
          if (!formData.timeline) { te.textContent = 'Select a timeline';     ok = false; } else te.textContent = '';
        }
      }
      return ok;
    }

    function genTrackingId() {
      return `SSD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!validateStep(3)) return;
      const btn = document.getElementById('btn-submit');
      const label = document.getElementById('submit-label');
      const spin  = document.getElementById('submit-spin');
      if (btn) btn.disabled = true;
      if (label) label.textContent = 'Submitting...';
      if (spin) spin.style.display = 'inline-block';

      const trackingId = genTrackingId();
      const payload = {
        name:        document.getElementById('f-name').value.trim(),
        email:       document.getElementById('f-email').value.trim(),
        company:     document.getElementById('f-company').value.trim() || null,
        projectType: formData.type,
        description: document.getElementById('f-desc').value.trim(),
        references:  document.getElementById('f-refs').value.trim() || null,
        budget:      formData.budget,
        timeline:    formData.timeline,
        referral:    document.getElementById('f-referral').value.trim() || null,
        trackingId,
        status:      'new',
        aiSummary:   '',
        aiEstimate:  '',
        adminNotes:  '',
        createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt:   firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        const docRef = await db.collection('portfolio-requests').add(payload);

        // AI estimate in background
        fetch('/api/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectType: payload.projectType, description: payload.description, budget: payload.budget, timeline: payload.timeline })
        }).then(r => r.json()).then(ai => {
          if (ai.summary || ai.estimate) {
            docRef.update({ aiSummary: ai.summary || '', aiEstimate: ai.estimate || '' });
            const ed = document.getElementById('est-display');
            const ec = document.getElementById('confirm-estimate');
            if (ed && ai.estimate) { ed.textContent = ai.estimate; if (ec) ec.style.display = 'flex'; }
          }
        }).catch(() => {});

        const td = document.getElementById('tid-display');
        if (td) td.textContent = trackingId;
        showStep('confirm');
        document.getElementById('tid-copy')?.addEventListener('click', () => {
          navigator.clipboard.writeText(trackingId).catch(() => {});
          const tc = document.getElementById('tid-copy');
          if (tc) tc.textContent = 'Copied!';
        });
      } catch (err) {
        console.error(err);
        if (label) label.textContent = 'Error — try again';
        if (spin) spin.style.display = 'none';
        if (btn) btn.disabled = false;
      }
    });
  }

  // ── Sidebar Tracking Lookup ───────────────────────────────────────────────
  const trackBtn    = document.getElementById('track-btn');
  const trackInput  = document.getElementById('track-input');
  const trackResult = document.getElementById('track-result');

  if (trackBtn && trackInput && trackResult) {
    const statusLabels = {
      new: '🟡 Received — under review', reviewing: '🔵 Being reviewed',
      in_discussion: '🟣 In discussion', accepted: '🟢 Accepted — project starting soon',
      declined: '🔴 Declined', completed: '✅ Completed'
    };
    async function doLookup() {
      const tid = trackInput.value.trim().toUpperCase();
      if (!tid) return;
      trackResult.style.display = 'none';
      trackResult.className = 'track-result';
      try {
        const snap = await db.collection('portfolio-requests').where('trackingId', '==', tid).limit(1).get();
        if (snap.empty) {
          trackResult.textContent = 'No project found with that ID.';
          trackResult.classList.add('err');
        } else {
          const d = snap.docs[0].data();
          trackResult.innerHTML = `<strong>${d.name}</strong> &mdash; ${d.projectType}<br>${statusLabels[d.status] || d.status}`;
          trackResult.classList.add('ok');
        }
      } catch (_) {
        trackResult.textContent = 'Lookup failed. Try again.';
        trackResult.classList.add('err');
      }
      trackResult.style.display = 'block';
    }
    trackBtn.addEventListener('click', doLookup);
    trackInput.addEventListener('keydown', e => { if (e.key === 'Enter') doLookup(); });
  }

  // ── AI Chat Widget ────────────────────────────────────────────────────────
  const widget   = document.getElementById('chat-widget');
  const toggle   = document.getElementById('chat-toggle');
  const closeBtn = document.getElementById('chat-close');
  const msgs     = document.getElementById('chat-messages');
  const input    = document.getElementById('chat-input');
  const send     = document.getElementById('chat-send');
  const iconOpen  = toggle?.querySelector('.chat-icon-open');
  const iconClose = toggle?.querySelector('.chat-icon-close');

  if (!widget || !toggle) return;

  let chatOpen = false;
  let chatHistory = [];

  function setChatOpen(open) {
    chatOpen = open;
    widget.classList.toggle('open', open);
    if (iconOpen)  iconOpen.style.display  = open ? 'none' : '';
    if (iconClose) iconClose.style.display = open ? ''     : 'none';
    if (open && input) input.focus();
    if (window.visualViewport) {
      setTimeout(handleViewportChange, 150);
    }
  }

  function handleViewportChange() {
    if (!chatOpen) {
      widget.style.bottom = '';
      return;
    }
    const vh = window.innerHeight;
    const vvHeight = window.visualViewport.height;
    const offset = vh - vvHeight;
    if (offset > 45) {
      widget.style.bottom = `calc(0.5rem + ${offset}px)`;
    } else {
      widget.style.bottom = '';
    }
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);
  }

  toggle.addEventListener('click', () => setChatOpen(!chatOpen));
  closeBtn?.addEventListener('click', () => setChatOpen(false));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && chatOpen) setChatOpen(false); });

  function appendMsg(role, text) {
    const div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    div.innerHTML = '<p>' + text.replace(/</g,'&lt;').replace(/\n/g,'<br>') + '</p>';
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  async function sendChat(text) {
    if (!text.trim()) return;
    if (input) input.value = '';
    appendMsg('user', text);
    chatHistory.push({ role: 'user', content: text });
    const typing = appendMsg('ai typing', '...');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: chatHistory })
      });
      const data = await res.json();
      const reply = data.reply || "I'm having trouble — try the inquiry form!";
      typing.remove();
      appendMsg('ai', reply);
      chatHistory.push({ role: 'assistant', content: reply });
    } catch (_) {
      typing.remove();
      appendMsg('ai', 'Connection issue. Please try again or use the inquiry form.');
    }
  }

  send?.addEventListener('click', () => sendChat(input?.value || ''));
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(input.value); }
  });

})();
