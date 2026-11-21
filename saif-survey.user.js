// ==UserScript==
// @name         رافع استبانة آراء المعلمين — سيف المعولي
// @namespace    saif.almawali.teacher-survey
// @version      1.6.4
// @description  يرفع «استبانة استطلاع آراء أعضاء الهيئة التعليمية في الحياة المدرسية» إلى البوابة التعليمية تلقائيًا في الخلفية. تصميم: سيف جمال المعولي — معولة بن شمس
// @author       سيف جمال المعولي
// @match        *://*.moe.gov.om/*
// @match        *://moe.gov.om/*
// @match        *://*.github.io/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_openInTab
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const VERSION = '1.6.4';
  const LOGIN_URL = 'https://moe.gov.om/portal/Services/UserLoginnew.aspx';
  const Q_URL = 'https://moe.gov.om/SMS/Questionaires/QuestionaireMain.aspx';
  const FORM_KEY = 'استطلاع آراء أعضاء الهيئة التعليمية';
  const K = 'SAIF_SV_STATE', P = 'SAIF_SV_PROG', T = 'SAIF_SV_THEME', O = 'SAIF_SV_OPTS';
  const TOP = window.top === window.self;
  const DEFAULT_OPT = 'غير مقيم';
  const LEVEL_TXT = { 1: 'متميز', 2: 'جيد', 3: 'ملائم', 4: 'غير ملائم', 5: 'يحتاج إلى تدخل' };
  const EXPIRE = 25 * 60000;

  /* ================= أدوات ================= */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const norm = s => (s || '').replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/[*.,،؛;:()\[\]\/\\\-–_"'«»!?؟+]/g, ' ').replace(/\s+/g, ' ').trim();
  const getS = () => GM_getValue(K, null);
  const setS = s => GM_setValue(K, s);
  const patch = o => { const s = getS(); if (!s) return null; Object.assign(s, o); setS(s); return s; };
  const UI_STEPS = ['تسجيل الدخول في البوابة', 'فتح «استبانات تطوير الأداء»', 'الضغط على «عرض»', 'الضغط على «اضافة»', 'اختيار استمارة أعضاء الهيئة التعليمية', 'تعبئة البنود', 'كتابة المقترح', 'الحفظ'];
  let curSt = 0;
  const prog = (pct, msg, kind, st) => { if (st != null) curSt = st; else { const o = GM_getValue(P, null); curSt = o && o.st != null ? o.st : curSt; } if (pct == null) { const o = GM_getValue(P, null); pct = o ? o.pct : 0; } GM_setValue(P, { pct, msg, kind: kind || 'info', st: curSt, t: Date.now() }); };
  const opts = () => Object.assign({ autoSave: true, wait: 25 }, GM_getValue(O, {}));
  const visible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  function fire(el) { ['input', 'change'].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true }))); }
  function runInPage(code) {
    const sc = document.createElement('script'); sc.textContent = code;
    (document.head || document.documentElement).appendChild(sc); sc.remove();
  }
  function clickEl(el) {
    try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
    // روابط javascript: (مثل تبويب «حقول الاستمارة») تُنفَّذ مباشرة داخل الصفحة
    const a = el.closest && el.closest('a');
    const href = a && a.getAttribute('href') || '';
    if (/^javascript:/i.test(href) && !a.getAttribute('onclick')) { runInPage(decodeURIComponent(href.replace(/^javascript:/i, ''))); return; }
    ['mouseover', 'mousedown', 'mouseup'].forEach(t => el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
    el.click();
  }
  const isClickable = el => !!(el.closest('a,button') || /^(INPUT|BUTTON|A)$/.test(el.tagName) || el.onclick || el.getAttribute('onclick'));
  function findByText(targets, tol) {
    tol = tol == null ? 6 : tol;
    const els = document.querySelectorAll('a,button,input,img,[onclick],[role=button],span,td,li,div,label,font,b,p,h3,h4');
    let best = null, bestScore = 1e9;
    for (const el of els) {
      if (!visible(el) || el.closest('#saifPanel')) continue;
      const own = el.tagName === 'INPUT' ? el.value : (el.tagName === 'IMG' ? '' : el.textContent);
      const texts = [own, el.getAttribute('title'), el.getAttribute('alt'), el.getAttribute('aria-label'), el.getAttribute('value')].map(norm).filter(Boolean);
      for (const t of texts) {
        if (t.length > 120) continue;
        for (const tg of targets) {
          const nt = norm(tg);
          if (t === nt || (t.includes(nt) && t.length <= nt.length + tol)) {
            const score = t.length + (isClickable(el) ? 0 : 1000);   // الأزرار والروابط أولًا
            if (score <= bestScore) { best = el; bestScore = score; }
          }
        }
      }
    }
    if (best) { const a = best.closest('a,button'); if (a && visible(a)) return a; }
    return best;
  }
  async function flash(el, label, quick) {
    try {
      const d = el.ownerDocument, w = d.defaultView;
      if (!d.getElementById('saifHlCss')) {
        const st = d.createElement('style'); st.id = 'saifHlCss';
        st.textContent = '.saif-hl{outline:3px solid #e6b93a!important;outline-offset:3px!important;box-shadow:0 0 0 8px rgba(230,185,58,.35)!important;border-radius:6px}' +
          '.saif-tip{position:absolute;z-index:2147483646;background:linear-gradient(135deg,#e6b93a,#c9971c);color:#fff;font:bold 13px Tahoma,sans-serif;padding:5px 12px;border-radius:12px;direction:rtl;pointer-events:none;box-shadow:0 4px 12px rgba(0,0,0,.3);white-space:nowrap}';
        (d.head || d.documentElement).appendChild(st);
      }
      try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
      el.classList.add('saif-hl');
      if (quick) { await sleep(110); el.classList.remove('saif-hl'); return; }
      const r = el.getBoundingClientRect(), tip = d.createElement('div');
      tip.className = 'saif-tip'; tip.textContent = '👆 الخطوة: ' + label;
      tip.style.left = Math.max(4, r.left + w.scrollX) + 'px'; tip.style.top = Math.max(4, r.top + w.scrollY - 34) + 'px';
      d.body.appendChild(tip);
      await sleep(1000);
      setTimeout(() => { el.classList.remove('saif-hl'); tip.remove(); }, 1400);
    } catch (e) {}
  }
  function allDocs(win, out) {
    out = out || [];
    try { out.push(win.document); for (let i = 0; i < win.frames.length; i++) allDocs(win.frames[i], out); } catch (e) {}
    return out;
  }
  const findPassword = doc => [...doc.querySelectorAll('input[type=password]')].find(visible);

  /* ================= صفحة الاستبانة (الرابط) ================= */
  if (/github\.io$/i.test(location.hostname)) {
    if (!document.getElementById('saif-survey-app')) return;
    const page = unsafeWindow;
    const send = m => window.postMessage(JSON.stringify(Object.assign({ from: 'saif-userscript' }, m)), '*');
    send({ type: 'SAIF_SURVEY_READY', version: VERSION });
    window.addEventListener('message', e => {
      let d = e.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch (x) { return; } }
      if (!d || d.from === 'saif-userscript') return;
      if (d.type === 'SAIF_SURVEY_UPLOAD' && typeof d.payload === 'string') { try { d.payload = JSON.parse(d.payload); } catch (x) { return; } }
      if (d.type === 'SAIF_SURVEY_PING') send({ type: 'SAIF_SURVEY_READY', version: VERSION });
      if (d.type === 'SAIF_SURVEY_UPLOAD' && d.payload) {
        const p = d.payload;
        setS({ active: true, phase: 'login', step: 0, directTried: false, navTries: 0, navTs: 0, qm: null, saving: false, waitItemsTs: 0, stepTs: Date.now(), ts: Date.now(), itemsDone: false, sugDone: false,
               data: { user: p.user, pass: p.pass, answers: p.answers, suggestion: p.suggestion } });
        if ('autoSave' in p) GM_setValue(O, Object.assign(opts(), { autoSave: !!p.autoSave }));
        prog(2, 'تم استلام الإجابات — سجّل الدخول في البوابة وسيبدأ الرفع تلقائيًا', 'user', 0);
        GM_openInTab(LOGIN_URL, { active: !!p.showPortal, insert: true, setParent: true });
      }
    });
    GM_addValueChangeListener(P, (k, o, n) => { if (n) send({ type: 'SAIF_SURVEY_PROGRESS', pct: n.pct, msg: n.msg, kind: n.kind, st: n.st }); });
    return;
  }

  /* ================= لوحة التحكم (تصميم عتاد) ================= */
  const THEMES = {
    gold:   ['#c9971c', '#e6b93a', '#fff8e1', '#fdf0c4', '#8a6510'],
    green:  ['#14897a', '#2bb39f', '#eafaf6', '#c9efe6', '#0d5c52'],
    blue:   ['#1d5fa8', '#3a86d6', '#eaf3fd', '#cfe2f8', '#123f70'],
    purple: ['#7b4bc4', '#9d72e0', '#f3edfc', '#e0d3f6', '#4f2e86'],
    black:  ['#2b2f36', '#4b5260', '#f2f3f5', '#dde0e5', '#15181c']
  };
  let panel = null;
  function buildPanel() {
    if (!TOP || panel) return;
    const css = `
#saifPanel{--a:#c9971c;--a2:#e6b93a;--bg:#fff8e1;--bg2:#fdf0c4;--dk:#8a6510;position:fixed;left:16px;bottom:16px;z-index:2147483647;width:310px;direction:rtl;font-family:Tahoma,'Segoe UI',sans-serif;font-size:13px;color:#3b2f12;background:var(--bg);border:1.5px solid var(--a2);border-radius:20px;box-shadow:0 12px 34px rgba(0,0,0,.25);overflow:hidden}
#saifPanel *{box-sizing:border-box;font-family:inherit}
#saifPanel .hd{display:flex;align-items:center;gap:8px;padding:12px 12px 10px;border-bottom:1px solid var(--bg2);cursor:move}
#saifPanel .bd{position:relative;width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--a2),var(--a));color:#fff;display:grid;place-items:center;font-weight:bold;font-size:11px;flex:none}
#saifPanel .bd i{position:absolute;bottom:-3px;left:-3px;width:12px;height:12px;border-radius:50%;background:#22b07d;border:2px solid #fff}
#saifPanel .bd.off i{background:#aaa}
#saifPanel .tt{flex:1;min-width:0}
#saifPanel .tt b{display:block;font-size:14px;color:var(--dk)}
#saifPanel .tt small{color:#8b7a52;font-size:11px}
#saifPanel .dots{display:flex;gap:4px}
#saifPanel .dots span{width:11px;height:11px;border-radius:50%;cursor:pointer;border:2px solid #fff;box-shadow:0 0 0 1px #ccc}
#saifPanel .dots span.on{box-shadow:0 0 0 2px var(--dk)}
#saifPanel .mn{width:28px;height:28px;border-radius:9px;border:1px solid var(--a2);background:#fff;cursor:pointer;font-weight:bold;color:var(--dk)}
#saifPanel .body{padding:12px;display:flex;flex-direction:column;gap:10px}
#saifPanel.min .body,#saifPanel.min .ft{display:none}
#saifPanel .info{display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid var(--bg2);border-radius:14px;padding:8px 12px}
#saifPanel .info span{font-weight:bold;color:var(--dk)}
#saifPanel .go{border:0;border-radius:14px;padding:14px;font-size:15px;font-weight:bold;color:#fff;background:linear-gradient(135deg,var(--a2),var(--a));cursor:pointer;box-shadow:0 5px 14px rgba(0,0,0,.18)}
#saifPanel .go:disabled{opacity:.5;cursor:not-allowed}
#saifPanel .card{background:#fff;border:1px solid var(--bg2);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}
#saifPanel .card label{display:flex;align-items:center;gap:6px;cursor:pointer}
#saifPanel .card hr{border:0;border-top:1px dashed var(--bg2);margin:4px 0}
#saifPanel .row{display:flex;justify-content:space-between;align-items:center}
#saifPanel .row input{width:64px;padding:4px 6px;border:1px solid var(--a2);border-radius:9px;text-align:center}
#saifPanel .stop{border:1px solid #f0a8a8;border-radius:14px;padding:11px;background:#fde3e3;color:#b42318;font-weight:bold;cursor:pointer}
#saifPanel .steps{list-style:none;margin:0;padding:8px 10px;background:#fff;border:1px solid var(--bg2);border-radius:14px;display:flex;flex-direction:column;gap:3px}
#saifPanel .steps li{display:flex;align-items:center;gap:8px;padding:3px 6px;border-radius:9px;color:#9a8a66;font-size:12.5px}
#saifPanel .steps li i{font-style:normal;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;font-size:11px;background:#f3ecd7;flex:none}
#saifPanel .steps li.ok{color:#127a55}#saifPanel .steps li.ok i{background:#22b07d;color:#fff}
#saifPanel .steps li.cur{color:var(--dk);font-weight:bold;background:var(--bg)}#saifPanel .steps li.cur i{background:var(--a);color:#fff;animation:saifp 1.2s infinite}
#saifPanel .steps li.warn{color:#8a5a00;font-weight:bold;background:#fff4d6}#saifPanel .steps li.warn i{background:#e0a100;color:#fff}
@keyframes saifp{50%{box-shadow:0 0 0 5px rgba(230,185,58,.35)}}
#saifPanel .mp{display:none;font-weight:bold;color:var(--dk);font-size:12px;background:#fff;border:1px solid var(--a2);border-radius:9px;padding:2px 7px}
#saifPanel.min .mp{display:inline-block}
#saifPanel.mob{right:auto;max-width:none;border-radius:16px;font-size:12px;max-height:70vh;display:flex;flex-direction:column}
  #saifPanel.mob .body{overflow-y:auto;padding:8px;gap:7px}
  #saifPanel.mob .hd{padding:8px 10px;gap:6px}
  #saifPanel.mob .bd{width:32px;height:32px;font-size:9px;border-radius:10px}
  #saifPanel.mob .tt b{font-size:12.5px}#saifPanel.mob .tt small{font-size:10px}
  #saifPanel.mob .dots{display:none}
  #saifPanel.mob .steps{padding:6px;display:grid;grid-template-columns:1fr 1fr;gap:2px 6px}
  #saifPanel.mob .steps li{font-size:11px;padding:2px 4px;gap:5px}
  #saifPanel.mob .steps li i{width:16px;height:16px;font-size:9px}
  #saifPanel.mob .go{padding:10px;font-size:13px}
  #saifPanel.mob .card{padding:7px 10px;gap:4px}
  #saifPanel.mob .stop,#saifPanel.mob .scan{padding:7px;font-size:12px}
  #saifPanel.mob .scan{display:none}
  #saifPanel.mob .st{padding:7px 10px;min-height:0}
  #saifPanel.mob .ft{display:none}
  #saifPanel.mob.min{width:auto!important}
  #saifPanel.mob.min .tt small{display:none}

#saifPanel .scan{border:1.5px dashed var(--a2);border-radius:14px;padding:9px;background:transparent;color:var(--dk);cursor:pointer;font-weight:bold}
#saifPanel .bar{height:10px;background:var(--bg2);border-radius:10px;overflow:hidden}
#saifPanel .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--a2),var(--a));transition:width .35s}
#saifPanel .pc{display:flex;justify-content:space-between;font-size:12px;color:var(--dk);font-weight:bold}
#saifPanel .st{background:#fff;border:1px solid var(--bg2);border-right:4px solid var(--a);border-radius:12px;padding:9px 12px;min-height:38px;line-height:1.6}
#saifPanel .st.user{border-right-color:#e0a100;color:#8a5a00;font-weight:bold}
#saifPanel .st.error{border-right-color:#d64545;color:#b42318;font-weight:bold}
#saifPanel .st.done{border-right-color:#22b07d;color:#127a55;font-weight:bold}
#saifPanel .ft{display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid var(--bg2);background:rgba(255,255,255,.4)}
#saifPanel .ft .ic{width:28px;height:28px;border-radius:9px;border:1px solid var(--a2);display:grid;place-items:center;background:#fff}
#saifPanel .ft b{display:block;font-size:12.5px}
#saifPanel .ft small{color:#8b7a52;font-size:11px}`;
    const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st);
    panel = document.createElement('div'); panel.id = 'saifPanel';
    panel.innerHTML = `
      <div class="hd">
        <div class="bd">استبانة<i></i></div>
        <div class="tt"><b>رافع استبانة المعلمين</b><small>الأتمتة الذكية • الإصدار ${VERSION}</small></div>
        <div class="dots">${Object.keys(THEMES).map(k => `<span data-t="${k}" style="background:${THEMES[k][0]}"></span>`).join('')}</div>
        <span class="mp">0%</span>
        <button class="mn" title="تصغير">—</button>
      </div>
      <div class="body">
        <div class="info">بيانات الاستبانة: <span class="dt">—</span></div>
        <ol class="steps">${UI_STEPS.map(t => `<li><i>○</i><span>${t}</span></li>`).join('')}</ol>
        <button class="go">▶ ابدأ الرفع إلى البوابة</button>
        <div class="card">
          <label><input type="radio" name="saifMode" value="save"> تعبئة وحفظ تلقائي</label>
          <label><input type="radio" name="saifMode" value="fill"> تعبئة فقط (أراجع وأحفظ بنفسي)</label>
          <hr>
          <div class="row"><span>⏱ انتظار استجابة البوابة (ثانية)</span><input type="number" class="wt" min="5" max="120"></div>
        </div>
        <button class="stop">■ إيقاف</button>
        <button class="scan">🔍 فحص عناصر الصفحة (للدعم الفني)</button>
        <div><div class="pc"><span class="pm">التقدّم</span><span class="pp">0%</span></div><div class="bar"><i></i></div></div>
        <div class="st">جاهز.</div>
      </div>
      <div class="ft"><div class="ic">👤</div><div><b>سيف جمال المعولي</b><small>معولة بن شمس (5-12)</small></div></div>`;
    document.body.appendChild(panel);
    // ملاءمة الهاتف: البوابة تُعرض مصغّرة على الهاتف، فنكبّر اللوحة لتناسب عرض الشاشة
    const fitMobile = () => {
      const mob = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (screen.width && screen.width <= 640);
      panel.classList.toggle('mob', !!mob);
      if (!mob) { panel.style.zoom = ''; return; }
      const f = Math.max(1, innerWidth / (screen.width || innerWidth));
      panel.style.zoom = String(f);
      panel.style.left = (8 / f) + 'px'; panel.style.bottom = (8 / f) + 'px';
      panel.style.width = panel.classList.contains('min') ? 'auto' : ((innerWidth / f) - 16) + 'px';
      panel.style.maxHeight = ((innerHeight / f) * 0.7) + 'px';
    };
    fitMobile(); addEventListener('resize', fitMobile);
    panel._fit = fitMobile;

    // الثيم
    const applyTheme = k => {
      const t = THEMES[k] || THEMES.gold;
      ['--a', '--a2', '--bg', '--bg2', '--dk'].forEach((v, i) => panel.style.setProperty(v, t[i]));
      panel.querySelectorAll('.dots span').forEach(s => s.classList.toggle('on', s.dataset.t === k));
    };
    applyTheme(GM_getValue(T, 'gold'));
    panel.querySelectorAll('.dots span').forEach(s => s.onclick = () => { GM_setValue(T, s.dataset.t); applyTheme(s.dataset.t); });
    // تصغير
    panel.querySelector('.mn').onclick = () => { panel.classList.toggle('min'); GM_setValue('SAIF_SV_MIN', panel.classList.contains('min')); panel._fit && panel._fit(); };
    if (GM_getValue('SAIF_SV_MIN', /Android|iPhone|Mobile/i.test(navigator.userAgent))) panel.classList.add('min');
    panel._fit && panel._fit();
    // سحب
    (function drag() {
      const hd = panel.querySelector('.hd'); let sx, sy, sl, sb, on = false;
      hd.addEventListener('mousedown', e => { if (e.target.closest('button,.dots')) return; on = true; sx = e.clientX; sy = e.clientY; const r = panel.getBoundingClientRect(); sl = r.left; sb = innerHeight - r.bottom; e.preventDefault(); });
      addEventListener('mousemove', e => { if (!on) return; panel.style.left = Math.max(0, sl + e.clientX - sx) + 'px'; panel.style.bottom = Math.max(0, sb - (e.clientY - sy)) + 'px'; });
      addEventListener('mouseup', () => on = false);
    })();
    // الخيارات
    const o = opts();
    panel.querySelector(`input[value="${o.autoSave ? 'save' : 'fill'}"]`).checked = true;
    panel.querySelector('.wt').value = o.wait;
    panel.querySelectorAll('input[name=saifMode]').forEach(r => r.onchange = () => GM_setValue(O, Object.assign(opts(), { autoSave: r.value === 'save' })));
    panel.querySelector('.wt').onchange = e => GM_setValue(O, Object.assign(opts(), { wait: Math.max(5, +e.target.value || 25) }));
    // أزرار
    panel.querySelector('.go').onclick = () => {
      const s = getS();
      if (!s || !s.data || !s.data.answers) return render();
      setS(Object.assign(s, { active: true, phase: findPassword(document) ? 'login' : 'nav', step: 0, directTried: false, navTries: 0, navTs: 0, qm: null, saving: false, waitItemsTs: 0, stepTs: Date.now(), ts: Date.now(), itemsDone: false, sugDone: false }));
      prog(4, 'بدأ الرفع...');
    };
    panel.querySelector('.scan').onclick = () => {
      const out = ['URL: ' + location.href, 'Version: ' + VERSION, 'State: ' + JSON.stringify(Object.assign({}, getS() || {}, { data: undefined }))];
      allDocs(window).forEach((d, fi) => {
        out.push('--- FRAME ' + fi + ': ' + (d.location ? d.location.pathname : ''));
        d.querySelectorAll('input,button,a,img,select,textarea,[onclick]').forEach(x => {
          if (x.closest('#saifPanel')) return;
          if (x.tagName === 'A' && !x.getAttribute('onclick') && !x.querySelector('img') && !(x.textContent || '').trim()) return;
          const at = n => x.getAttribute(n) ? ` ${n}="${String(x.getAttribute(n)).slice(0, 80)}"` : '';
          let line = `<${x.tagName.toLowerCase()}${at('type')}${at('id')}${at('name')}${at('value')}${at('title')}${at('alt')}${at('src')}${at('href')}${at('onclick')}> ${(x.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50)}${visible(x) ? '' : ' [مخفي]'}`;
          if (x.tagName === 'SELECT') line += ' OPTIONS: ' + [...x.options].slice(0, 8).map(o => o.text.trim()).join(' | ');
          out.push(line);
        });
      });
      const txt = out.join('\n');
      try { GM_setClipboard(txt); } catch (e) {}
      prog((GM_getValue(P, {}) || {}).pct || 0, 'تم نسخ تقرير الصفحة ✔ — الصقه وأرسله للدعم الفني', 'user');
    };
    panel.querySelector('.stop').onclick = () => { patch({ active: false, phase: 'stopped' }); prog(0, 'تم الإيقاف.', 'error'); };
    GM_addValueChangeListener(P, render);
    GM_addValueChangeListener(K, render);
    render();
  }
  function render() {
    if (!panel) return;
    const s = getS(), p = GM_getValue(P, null);
    const has = !!(s && s.data && s.data.answers);
    panel.querySelector('.dt').textContent = has ? `${s.data.answers.length} بندًا ✔` : 'لا توجد بيانات';
    panel.querySelector('.bd').classList.toggle('off', !(s && s.active));
    if (s && s.active && panel.classList.contains('min')) { panel.classList.remove('min'); panel._fit && panel._fit(); }
    panel.querySelector('.go').disabled = !has || !!(s && s.active);
    const lis = panel.querySelectorAll('.steps li');
    const live = p && s && (s.active || Date.now() - p.t < 10 * 60000);
    const stI = live && p.st != null ? p.st : -1;
    lis.forEach((li, i) => {
      let c = '', ic = '○';
      if (live && (p.kind === 'done' && p.pct >= 100 ? true : i < stI)) { c = 'ok'; ic = '✔'; }
      else if (live && i === stI) { c = p.kind === 'user' || p.kind === 'error' ? 'warn' : 'cur'; ic = c === 'warn' ? '!' : '▶'; }
      li.className = c; li.querySelector('i').textContent = ic;
    });
    const st = panel.querySelector('.st');
    if (p && (s && (s.active || Date.now() - p.t < 10 * 60000))) {
      panel.querySelector('.bar i').style.width = p.pct + '%';
      panel.querySelector('.pp').textContent = Math.round(p.pct) + '%';
      panel.querySelector('.mp').textContent = Math.round(p.pct) + '%';
      st.textContent = p.msg; st.className = 'st ' + p.kind;
    } else {
      panel.querySelector('.bar i').style.width = '0';
      panel.querySelector('.pp').textContent = '0%';
      st.className = 'st';
      st.textContent = has ? 'جاهز — اضغط «ابدأ الرفع».' : 'عبّئ الاستبانة من الرابط ثم اضغط «رفع إلى البوابة».';
    }
  }
  if (TOP) { if (document.body) buildPanel(); else addEventListener('DOMContentLoaded', buildPanel); }

  /* ================= خطوات التنقل ================= */
  const STEPS = [
    { name: 'أعمالي', t: ['أعمالي'] },
    { name: 'تطوير الأداء المدرسي', t: ['تطوير الأداء المدرسي'] },
    { name: 'استبانات تطوير الأداء', t: ['استبانات تطوير الأداء', 'استبانات تطوير الأداء المدرسي'] },
    { name: 'عرض', t: ['عرض', 'استعراض'], re: /btn_?show|show_?btn|btn_?view|view_?btn|btn_?display|display_?btn|btn_?ard|ard_?btn|3ard/i },
    { name: 'إضافة', t: ['إضافة', 'اضافة', '+ إضافة', '+إضافة', 'إضافة جديد', 'Add'], re: /btn_?add|add_?btn|img_?add|add_?img|ib_?add|lnk_?add|add_?new|addnew|insert|edafa/i },
    { name: 'اختيار الاستمارة', form: true }
  ];
  function chooseForm() {
    const key = norm(FORM_KEY);
    for (const sel of document.querySelectorAll('select')) {
      const opt = [...sel.options].find(o => norm(o.text).includes(key));
      if (opt) { if (sel.value !== opt.value) { sel.value = opt.value; fire(sel); } return true; }
    }
    const el = findByText(['استبانة استطلاع آراء أعضاء الهيئة التعليمية في الحياة المدرسية', 'استطلاع آراء أعضاء الهيئة التعليمية'], 40);
    if (el) { clickEl(el); return true; }
    return false;
  }
  const formSelects = () => {
    const d = norm(DEFAULT_OPT);
    return [...document.querySelectorAll('select')].filter(sel => [...sel.options].some(o => norm(o.text) === d));
  };

  /* ================= المطابقة ================= */
  function rowLabel(sel) {
    const row = sel.closest('tr') || sel.parentElement.parentElement;
    const c = row.cloneNode(true);
    c.querySelectorAll('select,script,style').forEach(x => x.remove());
    return norm(c.textContent);
  }
  function sim(a, b) {
    const A = new Set(a.split(' ')), B = new Set(b.split(' '));
    let i = 0; A.forEach(w => { if (B.has(w)) i++; });
    return (2 * i) / (A.size + B.size || 1);
  }
  function bestItem(label, answers) {
    let best = null, sc = 0;
    for (const a of answers) { const s = sim(label, norm(a.text)); if (s > sc) { sc = s; best = a; } }
    return sc >= 0.55 ? best : null;
  }
  function pickOpt(sel, level) {
    const want = norm(LEVEL_TXT[level]);
    for (const o of sel.options) if (norm(o.text).replace(/^[0-9٠-٩]+\s*/, '') === want) return o;
    for (const o of sel.options) if (norm(o.text).indexOf(String(level)) === 0) return o;
    return null;
  }

  /* ================= التعبئة والحفظ ================= */
  async function fillForm(s) {
    const sels = formSelects(), total = sels.length;
    let um = 0;
    prog(28, `تم فتح الاستمارة — ${total} بندًا`, 'info', 5);
    for (let i = 0; i < total; i++) {
      const cur = getS(); if (!cur || !cur.active) return;
      const m = bestItem(rowLabel(sels[i]), s.data.answers);
      const o = m && pickOpt(sels[i], m.level);
      if (o) { await flash(sels[i], '', true); if (sels[i].value !== o.value) { sels[i].value = o.value; fire(sels[i]); } } else um++;
      prog(28 + Math.round(((i + 1) / total) * 57), `تعبئة البند ${i + 1} من ${total}`, 'info', 5);
      await sleep(120);
    }
    patch({ itemsDone: true, unmatched: um });
    await fillSuggestion();
  }
  async function fillSuggestion() {
    const s = getS(); if (!s || !s.active) return;
    prog(88, 'كتابة المقترح في «حقول الاستمارة»...', 'info', 6);
    let ta = [...document.querySelectorAll('textarea')].find(visible);
    if (!ta) {
      const tab = findByText(['حقول الاستمارة']); if (tab) { await flash(tab, 'حقول الاستمارة'); clickEl(tab); }
      for (let i = 0; i < 25 && !ta; i++) { await sleep(400); ta = [...document.querySelectorAll('textarea')].find(visible) || document.querySelector('textarea'); }
    }
    if (!ta) { prog(88, 'لم أجد حقل المقترحات — افتح تبويب «حقول الاستمارة» وسأكمل', 'user'); return; }
    await flash(ta, 'كتابة المقترح'); ta.focus(); ta.value = (s.data.suggestion || '').slice(0, 1000); fire(ta);
    patch({ sugDone: true });
    await finish();
  }
  async function finish() {
    const s = getS(); if (!s || !s.active) return;
    const d = norm(DEFAULT_OPT);
    const remaining = formSelects().filter(x => norm(x.options[x.selectedIndex] ? x.options[x.selectedIndex].text : '') === d).length;
    const um = s.unmatched || 0;
    const end = (pct, msg, kind, st) => { patch({ active: false, phase: 'done', ts: Date.now(), data: { answers: s.data.answers, suggestion: s.data.suggestion } }); prog(pct, msg, kind, st); };
    if (remaining || um) return end(95, `تمت التعبئة، لكن ${remaining || um} بند لم يُطابق — أكمله ثم اضغط «حفظ»`, 'user', 5);
    if (!opts().autoSave) return end(100, 'اكتملت التعبئة 100% — راجع الاستمارة ثم اضغط «حفظ» بنفسك', 'user', 7);
    prog(96, 'جارٍ الحفظ...', 'info', 7);
    const btn = document.getElementById('ctl00_applicationPageContentPlaceHolder_btnAdd') || findByText(['حفظ', 'حفظ الاستمارة', 'حفظ البيانات']);
    if (!btn) return end(97, 'اكتملت التعبئة — لم أجد زر الحفظ، اضغط «حفظ» بنفسك', 'user', 7);
    hookSave();
    let result = null;
    const onRes = e => { result = String(e.detail || ''); };
    document.addEventListener('saif-save', onRes);
    await flash(btn, 'حفظ');
    patch({ saving: true });
    clickEl(btn);
    for (let k = 0; k < 60 && !result; k++) await sleep(500);
    document.removeEventListener('saif-save', onRes);
    patch({ saving: false });
    if (result && /^ok:[12]$/.test(result)) return end(100, 'تم رفع الاستبانة وحفظها في البوابة بنجاح ✔', 'done', 8);
    if (result && result.startsWith('msg:')) return end(97, 'رسالة البوابة: ' + result.replace(/^msg:[^:]*:/, ''), 'error', 7);
    return end(98, 'تم الضغط على «حفظ» — لم تصل رسالة تأكيد، تحقق من القائمة', 'user', 7);
  }

  /* ================= صفحة استبانات تطوير الأداء ================= */
  async function qMain(s) {
    const byId = id => document.getElementById('ctl00_applicationPageContentPlaceHolder_' + id);
    const val = id => { const d = byId('schoolFilter_' + id); return d && d.options[d.selectedIndex] ? d.options[d.selectedIndex].value : ''; };
    const formUrl = () => location.origin + '/SMS/Questionaires/Questionaire.aspx?SchYearID=' + val('ddlScholasticYears') + '&SchoolId=' + val('ddlSchools') + '&EduSysId=' + val('ddlEducationSystems');
    if (!s.qm) {
      const show = byId('showImageButton') || findByText(['عرض']);
      if (!show) return;
      prog(16, 'تم فتح «استبانات تطوير الأداء» ✔ — جارٍ الضغط على «عرض»', 'info', 2);
      await flash(show, 'عرض');
      patch({ qm: 'shown', stepTs: Date.now() });
      clickEl(show);
      return;
    }
    if (s.qm === 'shown') {
      const add = byId('ImgAdd');
      const ready = add && visible(add);
      if (!ready && Date.now() - s.stepTs < 15000) return;
      prog(22, 'تم «عرض» ✔ — جارٍ فتح «اضافة»', 'info', 3);
      if (ready) await flash(add, 'اضافة');
      if (!val('ddlSchools')) { prog(22, 'لم أستطع قراءة بيانات المدرسة — اضغط «اضافة» بنفسك', 'user', 3); return; }
      patch({ qm: 'add', phase: 'form', stepTs: Date.now() });
      location.href = formUrl();
    }
  }
  function hookSave() {
    const sc = document.createElement('script');
    sc.textContent = '(function(){if(window.__saifHooked)return;window.__saifHooked=1;var f=window.onCallingSuccess,g=window.RaiseMessage,c=window.CloseWinAndReturn;' +
      'window.onCallingSuccess=function(r){document.dispatchEvent(new CustomEvent("saif-save",{detail:"ok:"+r}));if(r=="1"||r=="2"){return;}try{return f.apply(this,arguments)}catch(e){}};' +
      'window.RaiseMessage=function(m,t){document.dispatchEvent(new CustomEvent("saif-save",{detail:"msg:"+t+":"+m}));return g&&g.apply(this,arguments)};})();';
    (document.head || document.documentElement).appendChild(sc); sc.remove();
  }

  /* ================= الحلقة الرئيسية ================= */
  let busy = false;
  setInterval(async () => {
    if (busy) return;
    const s = getS(); if (!s || !s.active) return;
    if (Date.now() - s.ts > EXPIRE) { patch({ active: false, phase: 'expired' }); prog(0, 'انتهت مهلة العملية — أعد المحاولة', 'error'); return; }
    busy = true;
    try { await run(s); } catch (e) { console.error('[SAIF]', e); } finally { busy = false; }
  }, 800);

  async function run(s) {
    const wait = opts().wait * 1000;
    // 1) تسجيل الدخول
    const pw = findPassword(document);
    if (pw && s.phase === 'login') {
      if (!s.data.pass) {
        const cur = GM_getValue(P, {});
        if (TOP && cur.pct !== 3) prog(3, 'سجّل الدخول في البوابة — سيبدأ الرفع تلقائيًا بعد الدخول', 'user', 0);
        return;
      }
      if (s.loginTs && Date.now() - s.loginTs < 15000) return;
      const ins = [...document.querySelectorAll('input')].filter(i => visible(i) && /^(text|email|tel|number|)$/i.test(i.getAttribute('type') || 'text'));
      const before = ins.filter(i => i.compareDocumentPosition(pw) & Node.DOCUMENT_POSITION_FOLLOWING);
      const u = before[before.length - 1] || ins[0];
      if (u) { u.focus(); u.value = s.data.user; fire(u); }
      pw.focus(); pw.value = s.data.pass; fire(pw);
      patch({ loginTs: Date.now() });
      const cap = ins.find(i => i !== u && /captcha|code|verif|رمز/i.test((i.name || '') + (i.id || '') + (i.placeholder || '')))
        || document.querySelector('img[src*="aptcha" i],img[id*="aptcha" i]');
      if (cap) { prog(6, 'اكتب رمز التحقق ثم اضغط «دخول» — سيكمل الرفع تلقائيًا', 'user'); return; }
      prog(6, 'جارٍ تسجيل الدخول...', 'info', 0);
      const btn = findByText(['دخول', 'تسجيل الدخول', 'تسجيل دخول', 'Login', 'Sign in']) || (pw.form && pw.form.querySelector('[type=submit]'));
      if (btn) clickEl(btn); else if (pw.form) pw.form.submit();
      return;
    }
    if (s.phase === 'login') {
      if (!TOP) return;
      if (allDocs(window).some(d => findPassword(d))) return;
      if (s.loginTs && Date.now() - s.loginTs < 2500) return;
      const d = Object.assign({}, s.data); delete d.pass; // حذف كلمة المرور بعد الدخول
      patch({ phase: 'nav', data: d, step: 0, stepTs: Date.now(), ts: Date.now() });
      prog(8, 'تم تسجيل الدخول ✔ — جارٍ فتح «استبانات تطوير الأداء»...', 'info', 1);
      return;
    }

    // 2) صفحة الاستمارة
    if (s.saving) {
      if (TOP) { patch({ active: false, phase: 'done', saving: false, ts: Date.now() }); prog(100, 'تم إرسال الاستبانة للحفظ ✔ — تأكد من ظهورها في قائمة «استبانات تطوير الأداء»', 'done', 8); }
      return;
    }
    if (formSelects().length >= 5) {
      const key = norm(FORM_KEY);
      const fsel = [...document.querySelectorAll('select')].find(x => [...x.options].some(o => norm(o.text).includes(key)));
      if (fsel && !norm(fsel.options[fsel.selectedIndex] ? fsel.options[fsel.selectedIndex].text : '').includes(key)) {
        if (s.formPickTs && Date.now() - s.formPickTs < 6000) return;
        const opt = [...fsel.options].find(o => norm(o.text).includes(key));
        patch({ formPickTs: Date.now(), itemsDone: false, sugDone: false });
        prog(26, 'اختيار «استبانة استطلاع آراء أعضاء الهيئة التعليمية»...', 'info', 4);
        fsel.value = opt.value; fire(fsel);
        return;
      }
      if (s.phase !== 'fill') s = patch({ phase: 'fill' });
      if (!s.itemsDone) {
        const all = formSelects(), ok = all.filter(x => bestItem(rowLabel(x), s.data.answers)).length;
        if (ok < all.length * 0.9) {
          if (!s.waitItemsTs) patch({ waitItemsTs: Date.now() });
          else if (Date.now() - s.waitItemsTs > 20000) prog(27, 'بنود الاستمارة لا تطابق استبانة أعضاء الهيئة التعليمية — اخترها من القائمة بنفسك', 'user', 4);
          return;
        }
        return fillForm(s);
      }
      if (!s.sugDone) return fillSuggestion();
      return finish();
    }
    if (s.phase === 'fill' && s.itemsDone && !s.sugDone && document.querySelector('textarea')) return fillSuggestion();

    // 3) التنقل
    if (s.phase !== 'nav') return;
    if (!TOP) return; // التنقل من النافذة الرئيسية فقط (لا من الإطارات الداخلية المخفية)
    if (/QuestionaireMain\.aspx/i.test(location.pathname)) return qMain(s);
    // فتح صفحة «استبانات تطوير الأداء» مباشرة — مع إعادة المحاولة إذا أعادتنا البوابة للرئيسية
    if (TOP && (s.navTries || 0) < 5) {
      if (Date.now() - (s.navTs || 0) < 5000) return;
      const n = (s.navTries || 0) + 1;
      patch({ navTries: n, navTs: Date.now(), stepTs: Date.now(), step: 0 });
      prog(12, n === 1 ? 'جارٍ فتح صفحة «استبانات تطوير الأداء»...' : `جارٍ فتح صفحة «استبانات تطوير الأداء» (محاولة ${n})...`, 'info', 1);
      location.href = Q_URL;
      return;
    }
    const elapsed = Date.now() - s.stepTs, cur = s.step;
    const uiOf = idx => idx <= 2 ? 1 : idx === 3 ? 2 : idx === 4 ? 3 : 4;
    const tryStep = async idx => {
      const st = STEPS[idx]; if (!st) return false;
      if (st.form) {
        const key = norm(FORM_KEY);
        const sel = [...document.querySelectorAll('select')].find(x => [...x.options].some(o => norm(o.text).includes(key)));
        if (sel) { prog(null, 'اختيار الاستمارة...', 'info', 4); await flash(sel, st.name); }
        return chooseForm();
      }
      const el = findByText(st.t);
      if (el) { prog(null, `جارٍ الضغط على «${st.name}»...`, 'info', uiOf(idx)); await flash(el, st.name); clickEl(el); return true; }
      // البحث بالاسم البرمجي للزر (id / name / صورة)
      if (st.re) {
        const c = [...document.querySelectorAll('input[type=submit],input[type=button],input[type=image],button,a,img,[onclick]')]
          .filter(x => visible(x) && !x.closest('#saifPanel'))
          .find(x => st.re.test([x.id, x.getAttribute('name'), x.getAttribute('src'), x.className, (x.getAttribute('onclick') || ''), (x.getAttribute('href') || '')].join(' ')));
        if (c) { const t = c.closest('a,button') || c; prog(null, `جارٍ الضغط على «${st.name}»...`, 'info', uiOf(idx)); await flash(t, st.name); clickEl(t); return true; }
      }
      // رابط داخل قائمة منسدلة مخفية: نفتح عنوانه مباشرة
      const nts = st.t.map(norm);
      const a = [...document.querySelectorAll('a[href]')].find(x => nts.includes(norm(x.textContent)) && !/^javascript|#$/i.test(x.getAttribute('href')));
      if (a) { location.href = a.href; return true; }
      return false;
    };
    if (cur >= STEPS.length) {
      if (elapsed > 10000 && elapsed < 11000) { const go = findByText(['عرض', 'التالي', 'بدء', 'متابعة']); if (go) clickEl(go); }
      if (elapsed > wait * 2 && TOP) prog(25, 'لم تظهر بنود الاستمارة — افتحها بنفسك وستُعبأ تلقائيًا', 'user');
      return;
    }
    let done = -1;
    if (await tryStep(cur)) done = cur;
    else if (elapsed > wait / 2) { for (let j = cur + 1; j < STEPS.length; j++) if (await tryStep(j)) { done = j; break; } }
    if (done >= 0) {
      const nx = done + 1;
      patch({ step: nx, stepTs: Date.now() });
      prog(8 + Math.round((nx / STEPS.length) * 18), STEPS[nx] ? `تم «${STEPS[done].name}» ✔ — التالي: «${STEPS[nx].name}»` : 'تم اختيار الاستمارة ✔ — جارٍ تحميل البنود...', 'info', nx >= STEPS.length ? 5 : uiOf(nx));
    } else if (elapsed > wait && TOP) {
      prog(8 + Math.round((cur / STEPS.length) * 18), `لم أجد «${STEPS[cur].name}» في هذه الصفحة — افتح «استبانات تطوير الأداء» بنفسك وسأكمل تلقائيًا`, 'user', uiOf(cur));
    }
  }
})();
