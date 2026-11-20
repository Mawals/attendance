/* SAIF teacher survey uploader - Saif Jamal Al-Maawali */
(function SAIF_UPLOADER() {
  if (!/moe\.gov\.om$/i.test(location.hostname)) {
    if (typeof window.SAIF_UNLOCK === 'function') { window.SAIF_UNLOCK(); return; }
    alert('\u0627\u0636\u063a\u0637 \u0647\u0630\u0627 \u0627\u0644\u0632\u0631 \u0648\u0623\u0646\u062a \u062f\u0627\u062e\u0644 \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a\u0629.'); return;
  }
  if (window.__saifRunning) { alert('\u0623\u062f\u0627\u0629 \u0627\u0644\u0631\u0641\u0639 \u062a\u0639\u0645\u0644 \u0628\u0627\u0644\u0641\u0639\u0644.'); return; }
  window.__saifRunning = true;

  var LEVEL_TXT = { 1: '\u0645\u062a\u0645\u064a\u0632', 2: '\u062c\u064a\u062f', 3: '\u0645\u0644\u0627\u0626\u0645', 4: '\u063a\u064a\u0631 \u0645\u0644\u0627\u0626\u0645', 5: '\u064a\u062d\u062a\u0627\u062c \u0625\u0644\u0649 \u062a\u062f\u062e\u0644' };
  var DEFAULT_OPT = '\u063a\u064a\u0631 \u0645\u0642\u064a\u0645';
  var STEPS = [
    { name: '\u0623\u0639\u0645\u0627\u0644\u064a', t: ['\u0623\u0639\u0645\u0627\u0644\u064a'] },
    { name: '\u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u0645\u062f\u0631\u0633\u064a', t: ['\u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u0645\u062f\u0631\u0633\u064a'] },
    { name: '\u0627\u0633\u062a\u0628\u0627\u0646\u0627\u062a \u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0623\u062f\u0627\u0621', t: ['\u0627\u0633\u062a\u0628\u0627\u0646\u0627\u062a \u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0623\u062f\u0627\u0621', '\u0627\u0633\u062a\u0628\u0627\u0646\u0627\u062a \u062a\u0637\u0648\u064a\u0631 \u0627\u0644\u0623\u062f\u0627\u0621 \u0627\u0644\u0645\u062f\u0631\u0633\u064a'] },
    { name: '\u0639\u0631\u0636', t: ['\u0639\u0631\u0636'] },
    { name: '\u0625\u0636\u0627\u0641\u0629', t: ['\u0625\u0636\u0627\u0641\u0629', '+ \u0625\u0636\u0627\u0641\u0629', '+\u0625\u0636\u0627\u0641\u0629', '\u0627\u0636\u0627\u0641\u0629'] },
    { name: '\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629', form: true }
  ];

  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var norm = function (s) {
    return (s || '').replace(/[\u064b-\u065f\u0670\u0640]/g, '')
      .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627').replace(/\u0629/g, '\u0647').replace(/\u0649/g, '\u064a').replace(/\u0624/g, '\u0648').replace(/\u0626/g, '\u064a')
      .replace(/[*.,\u060c\u061b;:()\[\]\/\\\-\u2013_"'\u00ab\u00bb!?\u061f+]/g, ' ').replace(/\s+/g, ' ').trim();
  };
  var visible = function (el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); };

  /* ---------- \u0627\u0644\u0648\u0627\u062c\u0647\u0629 ---------- */
  var st = document.createElement('style');
  st.textContent =
    '#saifOv{position:fixed;inset:0;z-index:2147483646;background:rgba(10,30,45,.82);display:flex;align-items:center;justify-content:center;font-family:Tahoma,"Segoe UI",sans-serif;direction:rtl}' +
    '#saifOv.peek{background:transparent;pointer-events:none;align-items:flex-start;padding-top:6px}' +
    '#saifOv .b{background:#fff;border-radius:18px;padding:24px;width:min(470px,92vw);box-shadow:0 20px 60px rgba(0,0,0,.4);text-align:center;pointer-events:auto}' +
    '#saifOv.peek .b{padding:10px 14px;border:2px solid #e0a100}' +
    '#saifOv h3{margin:0 0 4px;color:#0f3d5e;font-size:19px}#saifOv .s{color:#6b7c8a;font-size:12px;margin-bottom:12px}' +
    '#saifOv .bar{height:16px;background:#dde6ee;border-radius:10px;overflow:hidden}' +
    '#saifOv .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#14897a,#0f8a5f);transition:width .35s}' +
    '#saifOv .p{font-size:30px;font-weight:800;color:#0f3d5e;margin:8px 0 2px}#saifOv .m{min-height:22px;font-size:14px;color:#1d2b36}' +
    '#saifOv .m.user{color:#b36b00;font-weight:bold}#saifOv .m.error{color:#d64545;font-weight:bold}#saifOv .m.done{color:#0f8a5f;font-weight:bold}' +
    '#saifOv button{margin:12px 4px 0;border:1px solid #dde6ee;background:#fff;border-radius:10px;padding:6px 16px;cursor:pointer;font-family:inherit}' +
    '#saifOv .f{margin-top:10px;font-size:11px;color:#8a99a6}' +
    '#saifFrame{position:fixed;left:-5000px;top:0;width:1280px;height:900px;border:0;opacity:0;pointer-events:none;z-index:2147483645;background:#fff}' +
    '#saifFrame.show{left:3vw;top:12vh;width:94vw;height:85vh;opacity:1;pointer-events:auto;border:3px solid #e0a100;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.4)}';
  document.documentElement.appendChild(st);
  var ov = document.createElement('div'); ov.id = 'saifOv';
  ov.innerHTML = '<div class="b"><h3>\u0631\u0641\u0639 \u0627\u0633\u062a\u0628\u0627\u0646\u0629 \u0622\u0631\u0627\u0621 \u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0647\u064a\u0626\u0629 \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a\u0629</h3>' +
    '<div class="s">\u064a\u062a\u0645 \u0627\u0644\u0639\u0645\u0644 \u0641\u064a \u0627\u0644\u062e\u0644\u0641\u064a\u0629 \u2014 \u0644\u0627 \u062a\u063a\u0644\u0642 \u0647\u0630\u0627 \u0627\u0644\u062a\u0628\u0648\u064a\u0628</div>' +
    '<div class="bar"><i></i></div><div class="p">0%</div><div class="m"></div>' +
    '<button id="saifShow" style="display:none">\u0639\u0631\u0636 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629</button><button id="saifStop">\u0625\u064a\u0642\u0627\u0641</button>' +
    '<div class="f">\u062a\u0635\u0645\u064a\u0645: \u0633\u064a\u0641 \u062c\u0645\u0627\u0644 \u0627\u0644\u0645\u0639\u0648\u0644\u064a \u2014 \u0645\u062f\u0631\u0633\u0629 \u0645\u0639\u0648\u0644\u0629 \u0628\u0646 \u0634\u0645\u0633</div></div>';
  document.body.appendChild(ov);
  var ifr = document.createElement('iframe'); ifr.id = 'saifFrame';
  document.body.appendChild(ifr);

  var stopped = false, lastAlert = '', loads = 0;
  function cleanup() { stopped = true; window.__saifRunning = false; ov.remove(); ifr.remove(); st.remove(); }
  ov.querySelector('#saifStop').onclick = cleanup;
  ov.querySelector('#saifShow').onclick = function () { reveal(!ifr.classList.contains('show')); };
  function reveal(on) {
    ifr.classList.toggle('show', on); ov.classList.toggle('peek', on);
    ov.querySelector('#saifShow').textContent = on ? '\u0625\u062e\u0641\u0627\u0621 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629' : '\u0639\u0631\u0636 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629';
  }
  function prog(p, m, k) {
    k = k || 'info';
    ov.querySelector('.bar i').style.width = p + '%';
    ov.querySelector('.p').textContent = Math.round(p) + '%';
    var e = ov.querySelector('.m'); e.textContent = m; e.className = 'm ' + k;
    var done = (k === 'done' || k === 'error');
    ov.querySelector('#saifStop').textContent = done ? '\u0625\u063a\u0644\u0627\u0642' : '\u0625\u064a\u0642\u0627\u0641';
    try { if (window.opener) window.opener.postMessage({ type: 'SAIF_SURVEY_PROGRESS', pct: p, msg: m, kind: k }, '*'); } catch (x) {}
  }
  function fail(m) { prog(0, m, 'error'); ov.querySelector('#saifShow').style.display = ''; throw new Error('SAIF_STOP'); }

  /* ---------- \u0627\u0644\u0625\u0637\u0627\u0631 \u0627\u0644\u062e\u0644\u0641\u064a ---------- */
  function patchWin(w) {
    try {
      if (!w.__saifP) {
        w.__saifP = 1;
        w.open = function (u) { if (u) w.location.href = u; return w; };
        w.alert = function (m) { lastAlert = String(m); };
        w.confirm = function () { return true; };
      }
      for (var i = 0; i < w.frames.length; i++) patchWin(w.frames[i]);
    } catch (e) {}
  }
  ifr.addEventListener('load', function () { loads++; patchWin(ifr.contentWindow); });
  function docs() {
    var out = [];
    (function walk(w) { try { out.push(w.document); for (var i = 0; i < w.frames.length; i++) walk(w.frames[i]); } catch (e) {} })(ifr.contentWindow);
    return out;
  }
  function q(fn) { var d = docs(); for (var i = 0; i < d.length; i++) { var r = fn(d[i]); if (r) return r; } return null; }
  async function waitFor(fn, ms) {
    var t = Date.now();
    while (Date.now() - t < ms) { if (stopped) throw new Error('SAIF_STOP'); patchWin(ifr.contentWindow); var r = fn(); if (r) return r; await sleep(300); }
    return null;
  }
  function findByText(doc, targets, tol) {
    tol = tol == null ? 6 : tol;
    var els = doc.querySelectorAll('a,button,input[type=button],input[type=submit],span,td,li,div,label,font,b,p,h3,h4');
    var best = null, bestLen = 1e9;
    for (var i = 0; i < els.length; i++) {
      var el = els[i]; if (!visible(el)) continue;
      var t = norm(el.tagName === 'INPUT' ? el.value : el.textContent);
      if (!t || t.length > 120) continue;
      for (var j = 0; j < targets.length; j++) {
        var nt = norm(targets[j]);
        if ((t === nt || (t.indexOf(nt) > -1 && t.length <= nt.length + tol)) && t.length <= bestLen) { best = el; bestLen = t.length; }
      }
    }
    if (best) { var a = best.closest('a,button'); if (a && visible(a)) return a; }
    return best;
  }
  function fire(el) { ['input', 'change'].forEach(function (t) { el.dispatchEvent(new Event(t, { bubbles: true })); }); }
  function clickEl(el) {
    var a = el.closest && el.closest('a'); if (a && a.target && a.target !== '_self') a.target = '_self';
    if (el.form && el.form.target) el.form.target = '_self';
    var w = el.ownerDocument.defaultView;
    ['mouseover', 'mousedown', 'mouseup'].forEach(function (t) { el.dispatchEvent(new w.MouseEvent(t, { bubbles: true, cancelable: true, view: w })); });
    el.click();
  }
  var findPw = function () { return q(function (d) { return Array.prototype.find.call(d.querySelectorAll('input[type=password]'), visible); }); };
  var formSelects = function (d) {
    var dn = norm(DEFAULT_OPT);
    return Array.prototype.filter.call(d.querySelectorAll('select'), function (s) {
      return Array.prototype.some.call(s.options, function (o) { return norm(o.text) === dn; });
    });
  };
  var formDoc = function () { return q(function (d) { return formSelects(d).length >= 5 ? d : null; }); };

  /* ---------- \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 ---------- */
  function rowLabel(sel) {
    var row = sel.closest('tr') || sel.parentElement.parentElement;
    var c = row.cloneNode(true);
    c.querySelectorAll('select,script,style').forEach(function (x) { x.remove(); });
    return norm(c.textContent);
  }
  function sim(a, b) {
    var A = a.split(' '), B = {}, i = 0, u = {};
    b.split(' ').forEach(function (w) { B[w] = 1; });
    A.forEach(function (w) { if (B[w] && !u[w]) { i++; u[w] = 1; } });
    var na = Object.keys(A.reduce(function (o, w) { o[w] = 1; return o; }, {})).length;
    return (2 * i) / (na + Object.keys(B).length || 1);
  }
  function bestItem(label, answers) {
    var best = null, sc = 0;
    answers.forEach(function (a) { var s = sim(label, norm(a.text)); if (s > sc) { sc = s; best = a; } });
    return sc >= 0.55 ? best : null;
  }
  function pickOpt(sel, level) {
    var want = norm(LEVEL_TXT[level]);
    for (var i = 0; i < sel.options.length; i++) {
      var t = norm(sel.options[i].text).replace(/^[0-9\u0660-\u0669]+\s*/, '');
      if (t === want) return sel.options[i];
    }
    for (var j = 0; j < sel.options.length; j++) if (norm(sel.options[j].text).indexOf(String(level)) === 0) return sel.options[j];
    return null;
  }

  /* ---------- \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a ---------- */
  async function getData() {
    var code = '';
    if (!/firefox/i.test(navigator.userAgent)) { try { code = await navigator.clipboard.readText(); } catch (e) {} }
    if (!/^SAIF1:/.test((code || '').trim())) code = prompt('\u0627\u0636\u063a\u0637 Ctrl + V \u0644\u0644\u0635\u0642 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u0628\u0627\u0646\u0629\u060c \u062b\u0645 \u0627\u0636\u063a\u0637 \u00ab\u062d\u0633\u0646\u064b\u0627\u00bb:') || '';
    code = code.trim();
    if (code.indexOf('SAIF1:') !== 0) return null;
    try { return JSON.parse(decodeURIComponent(escape(atob(code.slice(6))))); } catch (e) { return null; }
  }

  /* ---------- \u0627\u0644\u062a\u0646\u0641\u064a\u0630 ---------- */
  (async function main() {
    try {
      prog(1, '\u062c\u0627\u0631\u064d \u0642\u0631\u0627\u0621\u0629 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u0628\u0627\u0646\u0629...');
      var data = await getData();
      try { navigator.clipboard.writeText(''); } catch (e) {}
      if (!data) fail('\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0627\u0633\u062a\u0628\u0627\u0646\u0629 \u2014 \u0627\u0631\u062c\u0639 \u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0627\u0633\u062a\u0628\u0627\u0646\u0629 \u0648\u0627\u0636\u063a\u0637 \u00ab\u0631\u0641\u0639 \u0625\u0644\u0649 \u0627\u0644\u0628\u0648\u0627\u0628\u0629\u00bb \u0623\u0648\u0644\u064b\u0627');

      prog(3, '\u062c\u0627\u0631\u064d \u0641\u062a\u062d \u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0641\u064a \u0627\u0644\u062e\u0644\u0641\u064a\u0629...');
      ifr.src = location.href.split('#')[0];
      var ok = await waitFor(function () { try { return loads > 0 && ifr.contentDocument && ifr.contentDocument.body; } catch (e) { return false; } }, 25000);
      if (!ok) fail('\u0627\u0644\u0628\u0648\u0627\u0628\u0629 \u0644\u0645 \u062a\u0633\u0645\u062d \u0628\u0627\u0644\u062a\u062d\u0645\u064a\u0644 \u0641\u064a \u0627\u0644\u062e\u0644\u0641\u064a\u0629');
      await sleep(800);

      /* \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 */
      var pw = findPw();
      if (pw) {
        if (!data.user || !data.pass) { reveal(true); prog(5, '\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0641\u064a \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0638\u0627\u0647\u0631\u0629\u060c \u0648\u0633\u064a\u0643\u0645\u0644 \u0627\u0644\u0631\u0641\u0639 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627', 'user'); }
        else {
          prog(5, '\u062c\u0627\u0631\u064d \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644...');
          var d = pw.ownerDocument;
          var ins = Array.prototype.filter.call(d.querySelectorAll('input'), function (i) { return visible(i) && /^(text|email|tel|number|)$/i.test(i.getAttribute('type') || 'text'); });
          var before = ins.filter(function (i) { return i.compareDocumentPosition(pw) & Node.DOCUMENT_POSITION_FOLLOWING; });
          var u = before[before.length - 1] || ins[0];
          if (u) { u.focus(); u.value = data.user; fire(u); }
          pw.focus(); pw.value = data.pass; fire(pw);
          var cap = ins.find(function (i) { return i !== u && /captcha|code|verif|\u0631\u0645\u0632/i.test((i.name || '') + (i.id || '') + (i.placeholder || '')); }) || d.querySelector('img[src*="aptcha" i],img[id*="aptcha" i]');
          if (cap) { reveal(true); prog(6, '\u0627\u0643\u062a\u0628 \u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642 \u0641\u064a \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u062b\u0645 \u0627\u0636\u063a\u0637 \u00ab\u062f\u062e\u0648\u0644\u00bb', 'user'); }
          else {
            var btn = findByText(d, ['\u062f\u062e\u0648\u0644', '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644', '\u062a\u0633\u062c\u064a\u0644 \u062f\u062e\u0648\u0644', 'Login', 'Sign in']) || (pw.form && pw.form.querySelector('[type=submit]'));
            if (btn) clickEl(btn); else if (pw.form) pw.form.submit();
          }
        }
        data.pass = '';
        var l0 = loads;
        var out = await waitFor(function () { return loads > l0 && !findPw(); }, 120000);
        if (!out) fail('\u062a\u0639\u0630\u0631 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u2014 \u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0648\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631');
        reveal(false);
        await sleep(1200);
      }
      data.pass = '';

      /* \u0627\u0644\u062a\u0646\u0642\u0644 */
      var i = 0, stepT = Date.now();
      while (!formDoc()) {
        if (stopped) return;
        var el = null, hit = -1;
        for (var j = i; j < STEPS.length && hit < 0; j++) {
          if (j > i && Date.now() - stepT < 12000) break;
          var s = STEPS[j];
          if (s.form) {
            var key = norm('\u0627\u0633\u062a\u0637\u0644\u0627\u0639 \u0622\u0631\u0627\u0621 \u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0647\u064a\u0626\u0629 \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a\u0629');
            var selF = q(function (dd) {
              return Array.prototype.find.call(dd.querySelectorAll('select'), function (x) { return Array.prototype.some.call(x.options, function (o) { return norm(o.text).indexOf(key) > -1; }); });
            });
            if (selF) {
              var opt = Array.prototype.find.call(selF.options, function (o) { return norm(o.text).indexOf(key) > -1; });
              if (selF.value !== opt.value) { selF.value = opt.value; fire(selF); }
              hit = j;
            } else {
              el = q(function (dd) { return findByText(dd, ['\u0627\u0633\u062a\u0628\u0627\u0646\u0629 \u0627\u0633\u062a\u0637\u0644\u0627\u0639 \u0622\u0631\u0627\u0621 \u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0647\u064a\u0626\u0629 \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a\u0629 \u0641\u064a \u0627\u0644\u062d\u064a\u0627\u0629 \u0627\u0644\u0645\u062f\u0631\u0633\u064a\u0629', '\u0627\u0633\u062a\u0637\u0644\u0627\u0639 \u0622\u0631\u0627\u0621 \u0623\u0639\u0636\u0627\u0621 \u0627\u0644\u0647\u064a\u0626\u0629 \u0627\u0644\u062a\u0639\u0644\u064a\u0645\u064a\u0629'], 40); });
              if (el) { clickEl(el); hit = j; }
            }
          } else {
            el = q(function (dd) { return findByText(dd, s.t); });
            if (el) { clickEl(el); hit = j; }
          }
        }
        if (hit >= 0) {
          i = hit + 1; stepT = Date.now();
          prog(5 + Math.round(i / STEPS.length * 20), STEPS[i] ? '\u062a\u0645 \u00ab' + STEPS[hit].name + '\u00bb \u2190 \u062c\u0627\u0631\u064d \u0641\u062a\u062d \u00ab' + STEPS[i].name + '\u00bb' : '\u062c\u0627\u0631\u064d \u0641\u062a\u062d \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629...');
          await sleep(1800);
          await waitFor(function () { try { return ifr.contentDocument.readyState === 'complete'; } catch (e) { return true; } }, 15000);
          continue;
        }
        if (i >= STEPS.length && Date.now() - stepT > 8000 && Date.now() - stepT < 9000) {
          var go = q(function (dd) { return findByText(dd, ['\u0639\u0631\u0636', '\u0627\u0644\u062a\u0627\u0644\u064a', '\u0628\u062f\u0621', '\u0645\u062a\u0627\u0628\u0639\u0629']); }); if (go) clickEl(go);
        }
        if (Date.now() - stepT > 45000) {
          reveal(true);
          prog(5 + Math.round(i / STEPS.length * 20), STEPS[i] ? '\u0644\u0645 \u0623\u062c\u062f \u00ab' + STEPS[i].name + '\u00bb \u2014 \u0627\u0636\u063a\u0637\u0647 \u0641\u064a \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u0648\u0633\u0623\u0643\u0645\u0644 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627' : '\u0627\u0641\u062a\u062d \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629 \u0641\u064a \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u0648\u0633\u0623\u0643\u0645\u0644\u0647\u0627 \u062a\u0644\u0642\u0627\u0626\u064a\u064b\u0627', 'user');
        }
        await sleep(500);
      }
      reveal(false);

      /* \u062a\u0639\u0628\u0626\u0629 \u0627\u0644\u0628\u0646\u0648\u062f */
      var fd = formDoc(), sels = formSelects(fd), total = sels.length, um = 0;
      prog(28, '\u062a\u0645 \u0641\u062a\u062d \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629 \u2014 ' + total + ' \u0628\u0646\u062f\u064b\u0627');
      for (var k = 0; k < total; k++) {
        if (stopped) return;
        var m = bestItem(rowLabel(sels[k]), data.answers);
        var o = m && pickOpt(sels[k], m.level);
        if (o) { sels[k].value = o.value; fire(sels[k]); } else um++;
        prog(28 + Math.round((k + 1) / total * 57), '\u062a\u0639\u0628\u0626\u0629 \u0627\u0644\u0628\u0646\u062f ' + (k + 1) + ' \u0645\u0646 ' + total);
        await sleep(120);
      }

      /* \u0627\u0644\u0645\u0642\u062a\u0631\u062d */
      prog(88, '\u0643\u062a\u0627\u0628\u0629 \u0627\u0644\u0645\u0642\u062a\u0631\u062d \u0641\u064a \u00ab\u062d\u0642\u0648\u0644 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629\u00bb...');
      var ta = q(function (dd) { return Array.prototype.find.call(dd.querySelectorAll('textarea'), visible); });
      if (!ta) {
        var tab = q(function (dd) { return findByText(dd, ['\u062d\u0642\u0648\u0644 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629']); });
        if (tab) clickEl(tab);
        ta = await waitFor(function () { return q(function (dd) { return dd.querySelector('textarea'); }); }, 10000);
      }
      if (ta) { ta.focus(); ta.value = (data.suggestion || '').slice(0, 1000); fire(ta); }

      /* \u0627\u0644\u062a\u062d\u0642\u0642 \u0648\u0627\u0644\u062d\u0641\u0638 */
      var fd2 = formDoc() || fd;
      var remaining = formSelects(fd2).filter(function (x) { return norm(x.options[x.selectedIndex] ? x.options[x.selectedIndex].text : '') === norm(DEFAULT_OPT); }).length;
      ov.querySelector('#saifShow').style.display = '';
      if (remaining || um || !ta) {
        reveal(true);
        prog(95, '\u062a\u0645\u062a \u0627\u0644\u062a\u0639\u0628\u0626\u0629\u060c \u0644\u0643\u0646 ' + (remaining || um || '\u062d\u0642\u0644 \u0627\u0644\u0645\u0642\u062a\u0631\u062d') + (ta ? ' \u0628\u0646\u062f \u0644\u0645 \u064a\u064f\u0637\u0627\u0628\u0642' : ' \u0644\u0645 \u064a\u064f\u0639\u062b\u0631 \u0639\u0644\u064a\u0647') + ' \u2014 \u0623\u0643\u0645\u0644\u0647 \u0641\u064a \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u062b\u0645 \u0627\u0636\u063a\u0637 \u00ab\u062d\u0641\u0638\u00bb', 'user');
        return;
      }
      if (!data.autoSave) { reveal(true); prog(100, '\u0627\u0643\u062a\u0645\u0644\u062a \u0627\u0644\u062a\u0639\u0628\u0626\u0629 100% \u2014 \u0631\u0627\u062c\u0639 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629 \u0641\u064a \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0638\u0627\u0647\u0631\u0629 \u062b\u0645 \u0627\u0636\u063a\u0637 \u00ab\u062d\u0641\u0638\u00bb', 'done'); return; }

      prog(96, '\u062c\u0627\u0631\u064d \u0627\u0644\u062d\u0641\u0638...');
      var save = q(function (dd) { return findByText(dd, ['\u062d\u0641\u0638', '\u062d\u0641\u0638 \u0627\u0644\u0627\u0633\u062a\u0645\u0627\u0631\u0629', '\u062d\u0641\u0638 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a', '\u0625\u0631\u0633\u0627\u0644']); });
      if (!save) { reveal(true); prog(97, '\u0627\u0643\u062a\u0645\u0644\u062a \u0627\u0644\u062a\u0639\u0628\u0626\u0629 \u2014 \u0644\u0645 \u0623\u062c\u062f \u0632\u0631 \u0627\u0644\u062d\u0641\u0638\u060c \u0627\u0636\u063a\u0637 \u00ab\u062d\u0641\u0638\u00bb \u0641\u064a \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0627\u0644\u0638\u0627\u0647\u0631\u0629', 'user'); return; }
      lastAlert = ''; var l1 = loads;
      clickEl(save);
      await waitFor(function () { return loads > l1 || lastAlert; }, 15000);
      await sleep(1000);
      if (/\u062e\u0637\u0627|\u062e\u0637\u0623|\u0641\u0634\u0644|error/i.test(lastAlert)) { reveal(true); prog(97, '\u0631\u0633\u0627\u0644\u0629 \u0627\u0644\u0628\u0648\u0627\u0628\u0629: ' + lastAlert, 'error'); return; }
      prog(100, '\u062a\u0645 \u0631\u0641\u0639 \u0627\u0644\u0627\u0633\u062a\u0628\u0627\u0646\u0629 \u0648\u062d\u0641\u0638\u0647\u0627 \u0628\u0646\u062c\u0627\u062d \u2714' + (lastAlert ? ' \u2014 ' + lastAlert : ''), 'done');
    } catch (e) {
      if (String(e && e.message) !== 'SAIF_STOP') { console.error(e); prog(0, '\u062d\u062f\u062b \u062e\u0637\u0623: ' + e.message, 'error'); }
    }
  })();
})();
