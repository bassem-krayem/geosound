/* ============================================================
   GeoSound – Client-side JS
   Handles: cookie-based token storage, audio player hints,
            quiz submission, accordion modules, flash messages
   ============================================================ */

'use strict';

/* ── Token helpers (stored in sessionStorage for SPA-style calls) ── */
const TOKEN_KEY = 'gs_token';

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

/* ── Generic fetch helper ── */
async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/* ── Flash messages (auto-dismiss) ── */
document.querySelectorAll('.alert[data-autohide]').forEach((el) => {
  setTimeout(() => {
    el.style.transition = 'opacity .4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 400);
  }, parseInt(el.dataset.autohide, 10) || 4000);
});

/* ── Accordion modules ── */
document.querySelectorAll('.module-header').forEach((btn) => {
  btn.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    const body = document.getElementById(btn.getAttribute('aria-controls'));
    if (body) body.hidden = expanded;
  });
});

/* ── Quiz form submission ── */
const quizForm = document.getElementById('quiz-form');
if (quizForm) {
  quizForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = quizForm.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'جارٍ الإرسال...';

    const answers = [];
    const groups = quizForm.querySelectorAll('[data-question]');
    let allAnswered = true;

    groups.forEach((group) => {
      const checked = group.querySelector('input[type="radio"]:checked');
      if (checked) {
        answers.push(parseInt(checked.value, 10));
      } else {
        allAnswered = false;
      }
    });

    if (!allAnswered) {
      showQuizError('يرجى الإجابة على جميع الأسئلة الـ5 قبل الإرسال.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'تقديم الاختبار';
      return;
    }

    const url = quizForm.dataset.submitUrl;
    const { ok, data } = await apiFetch(url, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });

    if (ok) {
      renderQuizResult(data.data);
      quizForm.style.display = 'none';
    } else {
      const msg = (data.errors && data.errors[0]?.msg) || data.message || 'فشل الإرسال.';
      showQuizError(msg);
      submitBtn.disabled = false;
      submitBtn.textContent = 'تقديم الاختبار';
    }
  });
}

function showQuizError(msg) {
  let el = document.getElementById('quiz-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'quiz-error';
    el.className = 'alert alert-danger';
    el.setAttribute('role', 'alert');
    quizForm.parentNode.insertBefore(el, quizForm);
  }
  el.textContent = msg;
  el.focus?.();
}

function renderQuizResult(result) {
  const container = document.getElementById('quiz-result-container');
  if (!container) return;
  const passClass = result.passed ? 'pass' : 'fail';
  container.innerHTML = `
    <div class="quiz-result ${passClass}" role="status" aria-live="polite">
      <div class="score ${passClass}" aria-label="Score: ${result.scorePercent} percent">${result.scorePercent}%</div>
      <p>${result.correct} / ${result.total} correct</p>
      <p>${result.message}</p>
      ${result.passed
        ? '<a href="javascript:location.reload()" class="btn btn-success mt-2">متابعة</a>'
        : '<button type="button" class="btn btn-primary mt-2" onclick="location.reload()">حاول مرة أخرى</button>'}
    </div>`;
  container.hidden = false;
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Confirm delete dialogs ── */
document.querySelectorAll('[data-confirm]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    if (!confirm(btn.dataset.confirm)) e.preventDefault();
  });
});

/* ── Quiz builder (teacher) – add/remove questions ── */
const quizBuilder = document.getElementById('quiz-builder');
if (quizBuilder) {
  // All 5 question blocks are always present; no add/remove needed
  // But we validate on submit
  const builderForm = document.getElementById('quiz-builder-form');
  if (builderForm) {
    builderForm.addEventListener('submit', (e) => {
      const blocks = builderForm.querySelectorAll('[data-qblock]');
      let valid = true;
      blocks.forEach((block) => {
        const text = block.querySelector('input[name$="[text]"]');
        if (text && !text.value.trim()) {
          valid = false;
          text.focus();
        }
      });
      if (!valid) {
        e.preventDefault();
        alert('يرجى ملء جميع نصوص الأسئلة.');
      }
    });
  }
}

/* ── Character counter for textareas ── */
document.querySelectorAll('textarea[maxlength]').forEach((ta) => {
  const hint = ta.parentNode.querySelector('.char-count');
  if (!hint) return;
  const update = () => { hint.textContent = `${ta.value.length} / ${ta.maxLength}`; };
  ta.addEventListener('input', update);
  update();
});

/* ── Audio player accessible announcements ── */
const audioEl = document.querySelector('.audio-player audio');
if (audioEl) {
  const liveRegion = document.getElementById('audio-status');
  const announce = (msg) => { if (liveRegion) liveRegion.textContent = msg; };
  audioEl.addEventListener('play',  () => announce('يعمل الصوت'));
  audioEl.addEventListener('pause', () => announce('الصوت متوقف'));
  audioEl.addEventListener('ended', () => announce('انتهى الصوت'));
  audioEl.addEventListener('error', () => announce('خطأ في تحميل الملف الصوتي'));
}
