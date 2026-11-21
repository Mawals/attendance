// ==UserScript==
// @name         رافع استبانة آراء المعلمين — سيف المعولي
// @namespace    saif.almawali.teacher-survey
// @version      1.3
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
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const VERSION = '1.3';
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
  const prog = (pct, msg, kind) => GM_setValue(P, { pct, msg, kind: kind || 'info', t: Date.now() });
  const opts = () => Object.assign({ autoSave: true, wait: 25 }, GM_getValue(O, {}));
  const visible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  function fire(el) { ['input', 'change'].forEach(t => el.dispatchEvent(new Event(t, { bubbles: true }))); }
  function clickEl(el) {
    try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
    ['mouseover', 'mousedown', 'mouseup'].forEach(t => el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window })));
    el.click();
  }
  const isClickable = el => !!(el.closest('a,button') || /^(INPUT|BUTTON|A)$/.test(el.tagName) || el.onclick || el.getAttribute('onclick'));
  function findByText(targets, tol) {
    tol = tol == null ? 6 : tol;
    const els = document.querySelectorAll('a,button,input[type=button],input[type=submit],input[type=image],img,span,td,li,div,label,font,b,p,h3,h4');
    let best = null, bestScore = 1e9;
    for (const el of els) {
      if (!visible(el) || el.closest('#saifPanel')) continue;
      const own = el.tagName === 'INPUT' ? el.value : (el.tagName === 'IMG' ? '' : el.textContent);
      const texts = [own, el.getAttribute('title'), el.getAttribute('alt')].map(norm).filter(Boolean);
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
        setS({ active: true, phase: 'login', step: 0, directTried: false, stepTs: Date.now(), ts: Date.now(), itemsDone: false, sugDone: false,
               data: { user: p.user, pass: p.pass, answers: p.answers, suggestion: p.suggestion } });
        if ('autoSave' in p) GM_setValue(O, Object.assign(opts(), { autoSave: !!p.autoSave }));
        prog(2, 'تم استلام الإجابات — سجّل الدخول في البوابة وسيبدأ الرفع تلقائيًا', 'user');
        GM_openInTab(LOGIN_URL, { active: !!p.showPortal, insert: true, setParent: true });
      }
    });
    GM_addValueChangeListener(P, (k, o, n) => { if (n) send({ type: 'SAIF_SURVEY_PROGRESS', pct: n.pct, msg: n.msg, kind: n.kind }); });
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
        <button class="mn" title="تصغير">—</button>
      </div>
      <div class="body">
        <div class="info">بيانات الاستبانة: <span class="dt">—</span></div>
        <button class="go">▶ ابدأ الرفع إلى البوابة</button>
        <div class="card">
          <label><input type="radio" name="saifMode" value="save"> تعبئة وحفظ تلقائي</label>
          <label><input type="radio" name="saifMode" value="fill"> تعبئة فقط (أراجع وأحفظ بنفسي)</label>
          <hr>
          <div class="row"><span>⏱ انتظار استجابة البوابة (ثانية)</span><input type="number" class="wt" min="5" max="120"></div>
        </div>
        <button class="stop">■ إيقاف</button>
        <div><div class="pc"><span class="pm">التقدّم</span><span class="pp">0%</span></div><div class="bar"><i></i></div></div>
        <div class="st">جاهز.</div>
      </div>
      <div class="ft"><div class="ic">👤</div><div><b>سيف جمال المعولي</b><small>معولة بن شمس (5-12)</small></div></div>`;
    document.body.appendChild(panel);

    // الثيم
    const applyTheme = k => {
      const t = THEMES[k] || THEMES.gold;
      ['--a', '--a2', '--bg', '--bg2', '--dk'].forEach((v, i) => panel.style.setProperty(v, t[i]));
      panel.querySelectorAll('.dots span').forEach(s => s.classList.toggle('on', s.dataset.t === k));
    };
    applyTheme(GM_getValue(T, 'gold'));
    panel.querySelectorAll('.dots span').forEach(s => s.onclick = () => { GM_setValue(T, s.dataset.t); applyTheme(s.dataset.t); });
    // تصغير
    panel.querySelector('.mn').onclick = () => { panel.classList.toggle('min'); GM_setValue('SAIF_SV_MIN', panel.classList.contains('min')); };
    if (GM_getValue('SAIF_SV_MIN', false)) panel.classList.add('min');
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
      setS(Object.assign(s, { active: true, phase: findPassword(document) ? 'login' : 'nav', step: 0, directTried: false, stepTs: Date.now(), ts: Date.now(), itemsDone: false, sugDone: false }));
      prog(4, 'بدأ الرفع...');
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
    if (s && s.active) panel.classList.remove('min');
    panel.querySelector('.go').disabled = !has || !!(s && s.active);
    const st = panel.querySelector('.st');
    if (p && (s && (s.active || Date.now() - p.t < 10 * 60000))) {
      panel.querySelector('.bar i').style.width = p.pct + '%';
      panel.querySelector('.pp').textContent = Math.round(p.pct) + '%';
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
    { name: 'عرض', t: ['عرض'] },
    { name: 'إضافة', t: ['إضافة', 'اضافة', '+ إضافة', '+إضافة', 'إضافة جديد', 'Add'] },
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
    prog(28, `تم فتح الاستمارة — ${total} بندًا`);
    for (let i = 0; i < total; i++) {
      const cur = getS(); if (!cur || !cur.active) return;
      const m = bestItem(rowLabel(sels[i]), s.data.answers);
      const o = m && pickOpt(sels[i], m.level);
      if (o) { if (sels[i].value !== o.value) { sels[i].value = o.value; fire(sels[i]); } } else um++;
      prog(28 + Math.round(((i + 1) / total) * 57), `تعبئة البند ${i + 1} من ${total}`);
      await sleep(120);
    }
    patch({ itemsDone: true, unmatched: um });
    await fillSuggestion();
  }
  async function fillSuggestion() {
    const s = getS(); if (!s || !s.active) return;
    prog(88, 'كتابة المقترح في «حقول الاستمارة»...');
    let ta = [...document.querySelectorAll('textarea')].find(visible);
    if (!ta) {
      const tab = findByText(['حقول الاستمارة']); if (tab) clickEl(tab);
      for (let i = 0; i < 25 && !ta; i++) { await sleep(400); ta = [...document.querySelectorAll('textarea')].find(visible) || document.querySelector('textarea'); }
    }
    if (!ta) { prog(88, 'لم أجد حقل المقترحات — افتح تبويب «حقول الاستمارة» وسأكمل', 'user'); return; }
    ta.focus(); ta.value = (s.data.suggestion || '').slice(0, 1000); fire(ta);
    patch({ sugDone: true });
    await finish();
  }
  async function finish() {
    const s = getS(); if (!s || !s.active) return;
    const d = norm(DEFAULT_OPT);
    const remaining = formSelects().filter(x => norm(x.options[x.selectedIndex] ? x.options[x.selectedIndex].text : '') === d).length;
    const um = s.unmatched || 0;
    const end = (pct, msg, kind) => { patch({ active: false, phase: 'done', ts: Date.now(), data: { answers: s.data.answers, suggestion: s.data.suggestion } }); prog(pct, msg, kind); };
    if (remaining || um) return end(95, `تمت التعبئة، لكن ${remaining || um} بند لم يُطابق — أكمله ثم اضغط «حفظ»`, 'user');
    if (!opts().autoSave) return end(100, 'اكتملت التعبئة 100% — راجع الاستمارة ثم اضغط «حفظ»', 'done');
    prog(96, 'جارٍ الحفظ...');
    const btn = findByText(['حفظ', 'حفظ الاستمارة', 'حفظ البيانات', 'إرسال']);
    if (!btn) return end(97, 'اكتملت التعبئة — لم أجد زر الحفظ، اضغط «حفظ» بنفسك', 'user');
    try { unsafeWindow.confirm = () => true; } catch (e) {}
    end(100, 'تم رفع الاستبانة وحفظها بنجاح ✔', 'done');
    await sleep(300);
    clickEl(btn);
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
        if (TOP && cur.pct !== 3) prog(3, 'سجّل الدخول في البوابة — سيبدأ الرفع تلقائيًا بعد الدخول', 'user');
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
      prog(6, 'جارٍ تسجيل الدخول...');
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
      prog(8, 'تم تسجيل الدخول — جارٍ فتح «أعمالي»...');
      return;
    }

    // 2) صفحة الاستمارة
    if (formSelects().length >= 5) {
      const key = norm(FORM_KEY);
      const fsel = [...document.querySelectorAll('select')].find(x => [...x.options].some(o => norm(o.text).includes(key)));
      if (fsel && !norm(fsel.options[fsel.selectedIndex] ? fsel.options[fsel.selectedIndex].text : '').includes(key)) {
        if (s.formPickTs && Date.now() - s.formPickTs < 6000) return;
        const opt = [...fsel.options].find(o => norm(o.text).includes(key));
        patch({ formPickTs: Date.now(), itemsDone: false, sugDone: false });
        prog(26, 'اختيار «استبانة استطلاع آراء أعضاء الهيئة التعليمية»...');
        fsel.value = opt.value; fire(fsel);
        return;
      }
      if (s.phase !== 'fill') s = patch({ phase: 'fill' });
      if (!s.itemsDone) return fillForm(s);
      if (!s.sugDone) return fillSuggestion();
      return finish();
    }
    if (s.phase === 'fill' && s.itemsDone && !s.sugDone && document.querySelector('textarea')) return fillSuggestion();

    // 3) التنقل
    if (s.phase !== 'nav') return;
    if (TOP && /QuestionaireMain\.aspx/i.test(location.pathname) && s.step < 3) {
      s = patch({ step: 3, stepTs: Date.now() });
      prog(18, 'تم فتح «استبانات تطوير الأداء» ← جارٍ الضغط على «عرض»');
    }
    if (TOP && !s.directTried && s.step < 3) {
      patch({ directTried: true, stepTs: Date.now() });
      prog(12, 'جارٍ فتح صفحة «استبانات تطوير الأداء»...');
      location.href = Q_URL;
      return;
    }
    const elapsed = Date.now() - s.stepTs, cur = s.step;
    const tryStep = idx => {
      const st = STEPS[idx]; if (!st) return false;
      if (st.form) return chooseForm();
      const el = findByText(st.t); if (el) { clickEl(el); return true; }
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
    if (tryStep(cur)) done = cur;
    else if (elapsed > wait / 2) { for (let j = cur + 1; j < STEPS.length; j++) if (tryStep(j)) { done = j; break; } }
    if (done >= 0) {
      const nx = done + 1;
      patch({ step: nx, stepTs: Date.now() });
      prog(8 + Math.round((nx / STEPS.length) * 18), STEPS[nx] ? `تم «${STEPS[done].name}» ← جارٍ فتح «${STEPS[nx].name}»` : 'جارٍ فتح الاستمارة...');
    } else if (elapsed > wait && TOP) {
      prog(8 + Math.round((cur / STEPS.length) * 18), `لم أجد «${STEPS[cur].name}» — اضغطه بنفسك وسأكمل تلقائيًا`, 'user');
    }
  }
})();
