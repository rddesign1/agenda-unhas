/**
 * Backend gratuito do protótipo de agendamento (Google Apps Script + Planilha Google).
 * Cole este arquivo em Extensões > Apps Script da planilha do salão (ver COMO-INSTALAR.md).
 * Os agendamentos ficam na aba "Agendamentos"; a configuração do salão fica na aba "Config".
 */
const TZ = 'America/Sao_Paulo';
const COLS = ['id', 'criado_em', 'data', 'hora', 'duracao', 'servico', 'preco', 'cliente', 'telefone', 'status', 'obs', 'sinal'];
const PIN_PADRAO = '1234';

function doGet() {
  const cfg = getConfig_();
  // Sem o arquivo index (app hospedado na Vercel), responde só que a API está ativa.
  try { HtmlService.createHtmlOutputFromFile('index'); } catch (e) {
    return ContentService.createTextOutput('API da agenda ativa.');
  }
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle((cfg && cfg.nome) || 'Agendamento')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange('A:Z').setNumberFormat('@');
    if (headers) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

function getConfig_() {
  const v = sheet_('Config').getRange('A1').getValue();
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}

function rows_() {
  const sh = sheet_('Agendamentos', COLS);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, COLS.length).getDisplayValues().map(function (r, i) {
    const o = { _row: i + 2 };
    COLS.forEach(function (c, j) { o[c] = r[j]; });
    return o;
  });
}

function strip_(r) { const o = Object.assign({}, r); delete o._row; return o; }
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function daysAgo_(n) { return Utilities.formatDate(new Date(Date.now() - n * 864e5), TZ, 'yyyy-MM-dd'); }
function toMin_(h) { const p = String(h).split(':'); return Number(p[0]) * 60 + Number(p[1]); }
// Evita que textos digitados virem fórmula na planilha.
function clean_(s, max) { s = String(s == null ? '' : s).trim().slice(0, max || 200); return /^[=+\-@]/.test(s) ? "'" + s : s; }

function checkPin_(pin) {
  const cfg = getConfig_();
  const esperado = (cfg && cfg.pin) || PIN_PADRAO;
  if (String(pin) !== String(esperado)) throw new Error('PIN incorreto.');
}

function overlaps_(data, hora, dur) {
  const ini = toMin_(hora), fim = ini + Number(dur);
  return rows_().some(function (r) {
    if (r.data !== data || r.status === 'cancelado') return false;
    const a = toMin_(r.hora), b = a + Number(r.duracao);
    return ini < b && fim > a;
  });
}

function append_(o) {
  sheet_('Agendamentos', COLS).appendRow(COLS.map(function (c) { return o[c] == null ? '' : String(o[c]); }));
}

/* ---------- API para o app hospedado fora do Google (ex.: Vercel) ---------- */
const API_FNS = ['getPublic', 'book', 'getMine', 'adminLogin', 'adminSaveConfig', 'adminSetStatus', 'adminSetSinal',
  'adminBlock', 'adminUnblock', 'adminAddPhoto', 'adminRemovePhoto'];
const API_IMPL = {
  getPublic: function (a) { return getPublic(); }, book: function (a) { return book(a[0]); }, getMine: function (a) { return getMine(a[0]); },
  adminLogin: function (a) { return adminLogin(a[0]); }, adminSaveConfig: function (a) { return adminSaveConfig(a[0], a[1]); },
  adminSetStatus: function (a) { return adminSetStatus(a[0], a[1], a[2]); }, adminSetSinal: function (a) { return adminSetSinal(a[0], a[1], a[2]); },
  adminBlock: function (a) { return adminBlock(a[0], a[1]); }, adminUnblock: function (a) { return adminUnblock(a[0], a[1]); },
  adminAddPhoto: function (a) { return adminAddPhoto(a[0], a[1]); }, adminRemovePhoto: function (a) { return adminRemovePhoto(a[0], a[1]); }
};
function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (API_FNS.indexOf(req.fn) < 0) throw new Error('Função desconhecida.');
    out = { ok: true, data: API_IMPL[req.fn](req.args || []) };
  } catch (err) {
    out = { ok: false, error: (err && err.message) || String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Público (cliente) ---------- */

function getPublic() {
  const cfg = getConfig_();
  if (cfg) delete cfg.pin;
  const hoje = today_();
  const busy = rows_()
    .filter(function (r) { return r.data >= hoje && r.status !== 'cancelado'; })
    .map(function (r) { return { data: r.data, hora: r.hora, duracao: r.duracao }; });
  return { config: cfg, busy: busy, fotos: fotos_() };
}

function book(p) {
  p = p || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.data) || !/^\d{2}:\d{2}$/.test(p.hora)) throw new Error('Data ou horário inválido.');
  const dur = parseInt(p.duracao, 10);
  if (!(dur >= 5 && dur <= 600)) throw new Error('Duração inválida.');
  const tel = String(p.telefone || '').replace(/\D/g, '');
  if (tel.length < 10 || tel.length > 13) throw new Error('Confira o número de WhatsApp (com DDD).');
  if (String(p.cliente || '').trim().length < 2) throw new Error('Informe seu nome.');
  if (p.data < today_()) throw new Error('Essa data já passou.');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    if (overlaps_(p.data, p.hora, dur)) throw new Error('Esse horário acabou de ser reservado. Escolha outro, por favor.');
    const id = Utilities.getUuid().slice(0, 8);
    const cfg = getConfig_();
    const cobra = cfg ? !!cfg.cobrarSinal : true;
    append_({
      sinal: cobra ? 'pendente' : '',
      id: id, criado_em: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'),
      data: p.data, hora: p.hora, duracao: dur, servico: clean_(p.servico, 80), preco: clean_(p.preco, 12),
      cliente: clean_(p.cliente, 80), telefone: tel, status: 'agendado', obs: clean_(p.obs, 300)
    });
    return { ok: true, id: id };
  } finally {
    lock.releaseLock();
  }
}

// Horários da própria cliente, pelo WhatsApp que ela usou para entrar (protótipo: sem senha).
function getMine(tel) {
  const t = String(tel || '').replace(/\D/g, '');
  if (t.length < 10) return [];
  const from = daysAgo_(180);
  return rows_().filter(function (r) { return r.telefone === t && r.data >= from && r.status !== 'bloqueado'; })
    .map(function (r) { return { id: r.id, data: r.data, hora: r.hora, duracao: r.duracao, servico: r.servico, preco: r.preco, status: r.status, sinal: r.sinal }; });
}

/* ---------- Manicure (protegido por PIN) ---------- */

function adminLogin(pin) {
  checkPin_(pin);
  const from = daysAgo_(120);
  return {
    config: getConfig_(), url: ScriptApp.getService().getUrl(), fotos: fotos_(),
    bookings: rows_().filter(function (r) { return r.data >= from; }).map(strip_)
  };
}

function adminSaveConfig(pin, cfg) {
  checkPin_(pin);
  const s = JSON.stringify(cfg || {});
  if (s.length > 48000) throw new Error('A configuração ficou grande demais (provavelmente a logo). Use uma imagem menor.');
  sheet_('Config').getRange('A1').setValue(s);
  return { ok: true };
}

function adminSetStatus(pin, id, status) {
  checkPin_(pin);
  if (['agendado', 'concluido', 'faltou', 'cancelado'].indexOf(status) < 0) throw new Error('Status inválido.');
  const r = rows_().filter(function (x) { return x.id === id; })[0];
  if (!r) throw new Error('Agendamento não encontrado.');
  sheet_('Agendamentos', COLS).getRange(r._row, COLS.indexOf('status') + 1).setValue(status);
  return { ok: true };
}

function adminBlock(pin, b) {
  checkPin_(pin);
  b = b || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.data) || !/^\d{2}:\d{2}$/.test(b.hora)) throw new Error('Data ou horário inválido.');
  const dur = parseInt(b.duracao, 10) || 60;
  append_({
    id: Utilities.getUuid().slice(0, 8), criado_em: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm'),
    data: b.data, hora: b.hora, duracao: dur, servico: 'Horário bloqueado', preco: '', cliente: '—', telefone: '',
    status: 'bloqueado', obs: clean_(b.obs, 200)
  });
  return { ok: true };
}

function adminUnblock(pin, id) {
  checkPin_(pin);
  const r = rows_().filter(function (x) { return x.id === id && x.status === 'bloqueado'; })[0];
  if (!r) throw new Error('Bloqueio não encontrado.');
  sheet_('Agendamentos', COLS).getRange(r._row, COLS.indexOf('status') + 1).setValue('cancelado');
  return { ok: true };
}

function adminSetSinal(pin, id, val) {
  checkPin_(pin);
  if (['pendente', 'pago', ''].indexOf(val) < 0) throw new Error('Valor inválido.');
  const r = rows_().filter(function (x) { return x.id === id; })[0];
  if (!r) throw new Error('Agendamento não encontrado.');
  sheet_('Agendamentos', COLS).getRange(r._row, COLS.indexOf('sinal') + 1).setValue(val);
  return { ok: true };
}

/* ---------- Portfólio (fotos dos trabalhos) ---------- */
const MAX_FOTOS = 12;

function fotos_() {
  const sh = sheet_('Fotos', ['id', 'img']);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 2).getValues()
    .filter(function (r) { return r[0] && r[1]; })
    .map(function (r) { return { id: String(r[0]), img: String(r[1]) }; });
}

function adminAddPhoto(pin, dataUrl) {
  checkPin_(pin);
  dataUrl = String(dataUrl || '');
  if (!/^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(dataUrl)) throw new Error('Imagem inválida.');
  if (dataUrl.length > 49000) throw new Error('Foto grande demais. Tente outra.');
  if (fotos_().length >= MAX_FOTOS) throw new Error('Limite de ' + MAX_FOTOS + ' fotos. Remova uma para adicionar outra.');
  sheet_('Fotos', ['id', 'img']).appendRow([Utilities.getUuid().slice(0, 8), dataUrl]);
  return { ok: true, fotos: fotos_() };
}

function adminRemovePhoto(pin, id) {
  checkPin_(pin);
  const sh = sheet_('Fotos', ['id', 'img']);
  const last = sh.getLastRow();
  if (last >= 2) {
    const ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { sh.deleteRow(i + 2); break; }
  }
  return { ok: true, fotos: fotos_() };
}
