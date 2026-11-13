(function () {
  'use strict';

  var STORAGE_KEY = 'attendance-counter-v1';
  var CIRCUMFERENCE = 2 * Math.PI * 92; // matches r="92" on the dial
  var state = { target: 75, subjects: [] };
  var newestId = null;

  /* ---------- Element refs ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var dial = $('dial');
  var dialFill = $('dial-fill');
  var dialTick = $('dial-tick');
  var overallPct = $('overall-pct');
  var overallCount = $('overall-count');
  var overallMsg = $('overall-msg');
  var targetRange = $('target-range');
  var targetNumber = $('target-number');
  var form = $('subject-form');
  var nameInput = $('subject-name');
  var attendedInput = $('subject-attended');
  var totalInput = $('subject-total');
  var formError = $('form-error');
  var list = $('subjects');
  var emptyState = $('empty-state');
  var resetAll = $('reset-all');

  /* ---------- Helpers ---------- */
  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function formatPct(p) {
    var rounded = Math.round(p * 10) / 10;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }


  /* ---------- Storage ---------- */
  function isValidSubject(s) {
    return s && typeof s.id === 'string' && typeof s.name === 'string' &&
      Number.isInteger(s.attended) && Number.isInteger(s.total) &&
      s.attended >= 0 && s.total >= s.attended;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.subjects)) {
        state.target = clamp(parseInt(saved.target, 10) || 75, 1, 100);
        state.subjects = saved.subjects.filter(isValidSubject);
      }
    } catch (err) {
      /* storage unavailable or corrupted: start fresh */
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* storage unavailable: the app still works for this session */
    }
  }

  /* ---------- Attendance maths ---------- */
  function getStats(attended, total, target) {
    if (total === 0) {
      return { status: 'empty', pct: 0, canMiss: 0, mustAttend: 0 };
    }
    var pct = (attended / total) * 100;
    var result = { pct: pct, canMiss: 0, mustAttend: 0 };

    if (pct >= target) {
      result.status = 'good';
      // Largest k with attended / (total + k) >= target / 100
      result.canMiss = Math.max(0, Math.floor((attended * 100 - target * total) / target));
    } else {
      result.status = pct >= target - 10 ? 'warn' : 'bad';
      // Smallest n with (attended + n) / (total + n) >= target / 100
      result.mustAttend = target >= 100
        ? Infinity
        : Math.ceil((target * total - 100 * attended) / (100 - target));
    }
    return result;
  }

  function buildMessage(stats, target) {
    if (stats.status === 'empty') {
      return { text: 'No classes logged yet.', className: '' };
    }
    if (stats.status === 'good') {
      if (stats.canMiss > 0) {
        return {
          parts: ['You can miss ', String(stats.canMiss), ' more and stay at or above ' + target + '%.'],
          className: 'good'
        };
      }
      return { text: 'On target. Do not miss the next class.', className: 'good' };
    }
    if (stats.mustAttend === Infinity) {
      return { text: 'A target of 100% can no longer be reached.', className: 'bad' };
    }
    return {
      parts: ['Attend the next ', String(stats.mustAttend), ' in a row to reach ' + target + '%.'],
      className: stats.status
    };
  }

  /* Fills a node with a message; the key number is highlighted */
  function writeMessage(node, msg) {
    node.textContent = '';
    if (msg.parts) {
      node.appendChild(document.createTextNode(msg.parts[0]));
      node.appendChild(el('mark', '', msg.parts[1]));
      node.appendChild(document.createTextNode(msg.parts[2]));
    } else {
      node.textContent = msg.text;
    }
  }

  /* ---------- Rendering ---------- */
  function renderOverall() {
    var attended = 0, total = 0;
    state.subjects.forEach(function (s) { attended += s.attended; total += s.total; });

    var stats = getStats(attended, total, state.target);

    overallPct.textContent = formatPct(stats.pct);
    overallCount.textContent = attended + ' of ' + total + ' classes';
    dial.dataset.status = stats.status;
    dialFill.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - clamp(stats.pct, 0, 100) / 100));
    dialTick.setAttribute('transform', 'rotate(' + (state.target * 3.6) + ' 110 110)');

    if (state.subjects.length === 0) {
      overallMsg.className = 'verdict';
      overallMsg.textContent = 'Add a subject to begin.';
      return;
    }

    var msg = buildMessage(stats, state.target);
    overallMsg.className = 'verdict ' + msg.className;
    writeMessage(overallMsg, msg);
  }

  function renderSubject(s) {
    var stats = getStats(s.attended, s.total, state.target);
    var msg = buildMessage(stats, state.target);

    var li = el('li', 'subject' + (s.id === newestId ? ' is-new' : ''));
    li.dataset.id = s.id;

    var top = el('div', 'subject-top');
    var titleBox = el('div');
    titleBox.appendChild(el('h3', 'subject-name', s.name));
    titleBox.appendChild(el('p', 'subject-count', s.attended + ' attended of ' + s.total + ' held'));
    top.appendChild(titleBox);
    top.appendChild(el('span', 'badge ' + stats.status, formatPct(stats.pct) + '%'));
    li.appendChild(top);

    var bar = el('div', 'bar');
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', s.name + ' attendance ' + formatPct(stats.pct) + ' percent, target ' + state.target + ' percent');
    var fill = el('div', 'bar-fill ' + stats.status);
    fill.style.width = clamp(stats.pct, 0, 100) + '%';
    var tick = el('div', 'bar-target');
    tick.style.left = state.target + '%';
    bar.appendChild(fill);
    bar.appendChild(tick);
    li.appendChild(bar);

    var message = el('p', 'subject-msg');
    writeMessage(message, msg);
    li.appendChild(message);

    var actions = el('div', 'actions');
    actions.appendChild(actionButton('btn btn-present', 'present', 'Present'));
    actions.appendChild(actionButton('btn btn-absent', 'absent', 'Absent'));
    var undo = actionButton('btn btn-ghost', 'undo', 'Undo');
    undo.disabled = !s.last;
    actions.appendChild(undo);
    actions.appendChild(el('span', 'spacer'));
    actions.appendChild(actionButton('btn btn-ghost', 'delete', 'Delete'));
    li.appendChild(actions);

    return li;
  }

  function actionButton(className, action, label) {
    var b = el('button', className, label);
    b.type = 'button';
    b.dataset.action = action;
    return b;
  }

  function render() {
    list.textContent = '';
    state.subjects.forEach(function (s) { list.appendChild(renderSubject(s)); });
    newestId = null;

    var has = state.subjects.length > 0;
    emptyState.hidden = has;
    resetAll.hidden = !has;

    targetRange.value = state.target;
    targetNumber.value = state.target;

    renderOverall();
  }

  /* ---------- Actions ---------- */
  function findSubject(id) {
    for (var i = 0; i < state.subjects.length; i++) {
      if (state.subjects[i].id === id) return state.subjects[i];
    }
    return null;
  }

  function handleAction(id, action) {
    var s = findSubject(id);
    if (!s) return;

    if (action === 'present') {
      s.attended += 1; s.total += 1; s.last = 'present';
    } else if (action === 'absent') {
      s.total += 1; s.last = 'absent';
    } else if (action === 'undo') {
      if (s.last === 'present') { s.attended -= 1; s.total -= 1; }
      else if (s.last === 'absent') { s.total -= 1; }
      s.last = null;
    } else if (action === 'delete') {
      if (!window.confirm('Delete "' + s.name + '" and its attendance record?')) return;
      state.subjects = state.subjects.filter(function (x) { return x.id !== id; });
    }

    save();
    render();
  }

  function setTarget(value) {
    var n = parseInt(value, 10);
    if (isNaN(n)) return;
    state.target = clamp(n, 1, 100);
    save();
    render();
  }

  function showError(message) {
    formError.textContent = message;
    formError.hidden = false;
  }

  function onSubmit(event) {
    event.preventDefault();
    formError.hidden = true;

    var name = nameInput.value.trim();
    var attended = parseInt(attendedInput.value, 10);
    var total = parseInt(totalInput.value, 10);

    if (!name) { showError('Enter a subject name.'); nameInput.focus(); return; }
    if (isNaN(attended) || isNaN(total) || attended < 0 || total < 0) {
      showError('Enter whole numbers of 0 or more for both class counts.');
      return;
    }
    if (attended > total) {
      showError('Classes attended cannot be more than classes held.');
      attendedInput.focus();
      return;
    }

    var subject = { id: makeId(), name: name, attended: attended, total: total, last: null };
    state.subjects.push(subject);
    newestId = subject.id;
    save();
    render();

    form.reset();
    attendedInput.value = 0;
    totalInput.value = 0;
    nameInput.focus();
  }

  /* ---------- Events ---------- */
  form.addEventListener('submit', onSubmit);

  list.addEventListener('click', function (event) {
    var button = event.target.closest('button[data-action]');
    if (!button) return;
    var item = button.closest('.subject');
    if (item) handleAction(item.dataset.id, button.dataset.action);
  });

  targetRange.addEventListener('input', function () { setTarget(targetRange.value); });
  targetNumber.addEventListener('change', function () { setTarget(targetNumber.value); });

  resetAll.addEventListener('click', function () {
    if (!window.confirm('Remove every subject and its attendance record?')) return;
    state.subjects = [];
    save();
    render();
  });

  /* ---------- Start ---------- */
  load();
  render();
})();
