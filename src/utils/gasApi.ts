import type {
  BudgetLimit,
  Transaction,
  Wallet,
  WishlistItem,
} from '../types/finance';

export interface GasPayload {
  wallets: Wallet[];
  transactions: Transaction[];
  budgets: BudgetLimit[];
  wishlist: WishlistItem[];
}

export async function fetchAllFromGas(webAppUrl: string): Promise<GasPayload> {
  const url = `${webAppUrl.trim()}${webAppUrl.includes('?') ? '&' : '?'}action=getAll`;
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Gagal membaca data dari Google Apps Script.`);
  }
  const json = await res.json();
  if (!json.ok || !json.data) {
    throw new Error(json.error || 'Respons Google Apps Script tidak valid.');
  }
  return json.data as GasPayload;
}

export async function postGasAction(
  webAppUrl: string,
  action: string,
  payload: unknown
): Promise<void> {
  if (!webAppUrl.trim()) return;
  const res = await fetch(webAppUrl.trim(), {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Gagal mengirim mutasi ke Google Apps Script.`);
  }
  const json = await res.json();
  if (!json.ok) {
    throw new Error(json.error || 'Operasi Google Apps Script ditolak.');
  }
}

export const GAS_CODE_TEMPLATE = `/**
 * DEXX FINANCE — Google Apps Script Backend (Google Sheets JSON API)
 * Tempelkan di Extensions > Apps Script, jalankan setupDatabase(), lalu Deploy sebagai Web App (Publik).
 */
const SHEETS = {
  WALLETS: 'Wallets',
  TRANSACTIONS: 'Transactions',
  BUDGETS: 'Budgets',
  WISHLIST: 'Wishlist',
};

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss, SHEETS.WALLETS, ['id','name','type','initialBalance','institution','accountNumber']);
  ensureSheet(ss, SHEETS.TRANSACTIONS, ['id','date','type','category','description','amount','walletId','toWalletId','createdAt']);
  ensureSheet(ss, SHEETS.BUDGETS, ['id','category','limitAmount']);
  ensureSheet(ss, SHEETS.WISHLIST, ['id','title','category','targetAmount','currentAmount','targetDate','walletId','notes']);
}

function ensureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const obj = {};
    for (let c = 0; c < headers.length; c++) {
      let val = row[c];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[headers[c]] = val;
    }
    rows.push(obj);
  }
  return rows;
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const action = (e && e.parameter && e.parameter.action) || 'getAll';
    if (action === 'ping') return jsonResponse({ ok: true, service: 'DEXX FINANCE GAS API' });

    const wallets = sheetToObjects(ss.getSheetByName(SHEETS.WALLETS)).map(function (w) {
      return {
        id: String(w.id),
        name: String(w.name),
        type: String(w.type || 'bank'),
        initialBalance: Number(w.initialBalance || 0),
        institution: w.institution ? String(w.institution) : '',
        accountNumber: w.accountNumber ? String(w.accountNumber) : '',
      };
    });

    let transactions = sheetToObjects(ss.getSheetByName(SHEETS.TRANSACTIONS)).map(function (t) {
      return {
        id: String(t.id),
        date: String(t.date),
        type: String(t.type),
        category: String(t.category),
        description: String(t.description || ''),
        amount: Number(t.amount || 0),
        walletId: String(t.walletId),
        toWalletId: t.toWalletId ? String(t.toWalletId) : undefined,
        createdAt: String(t.createdAt || ''),
      };
    });

    const startDate = e && e.parameter && e.parameter.startDate;
    const endDate = e && e.parameter.endDate;
    if (startDate && endDate) {
      transactions = transactions.filter(function (t) {
        return t.date >= startDate && t.date <= endDate;
      });
    }

    const budgets = sheetToObjects(ss.getSheetByName(SHEETS.BUDGETS)).map(function (b) {
      return { id: String(b.id), category: String(b.category), limitAmount: Number(b.limitAmount || 0) };
    });

    const wishlist = sheetToObjects(ss.getSheetByName(SHEETS.WISHLIST)).map(function (wl) {
      return {
        id: String(wl.id),
        title: String(wl.title),
        category: String(wl.category || 'Umum'),
        targetAmount: Number(wl.targetAmount || 0),
        currentAmount: Number(wl.currentAmount || 0),
        targetDate: String(wl.targetDate || ''),
        walletId: String(wl.walletId || ''),
        notes: wl.notes ? String(wl.notes) : '',
      };
    });

    return jsonResponse({ ok: true, data: { wallets: wallets, transactions: transactions, budgets: budgets, wishlist: wishlist } });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    const payload = body.payload || {};

    if (action === 'syncAll') {
      replaceSheetData(ss.getSheetByName(SHEETS.WALLETS), payload.wallets, ['id','name','type','initialBalance','institution','accountNumber']);
      replaceSheetData(ss.getSheetByName(SHEETS.TRANSACTIONS), payload.transactions, ['id','date','type','category','description','amount','walletId','toWalletId','createdAt']);
      replaceSheetData(ss.getSheetByName(SHEETS.BUDGETS), payload.budgets, ['id','category','limitAmount']);
      replaceSheetData(ss.getSheetByName(SHEETS.WISHLIST), payload.wishlist, ['id','title','category','targetAmount','currentAmount','targetDate','walletId','notes']);
      return jsonResponse({ ok: true });
    }
    if (action === 'upsertTransaction') {
      upsertRow(ss.getSheetByName(SHEETS.TRANSACTIONS), payload, ['id','date','type','category','description','amount','walletId','toWalletId','createdAt']);
      return jsonResponse({ ok: true });
    }
    if (action === 'deleteTransaction') {
      deleteRowById(ss.getSheetByName(SHEETS.TRANSACTIONS), payload.id);
      return jsonResponse({ ok: true });
    }
    if (action === 'upsertWallet') {
      upsertRow(ss.getSheetByName(SHEETS.WALLETS), payload, ['id','name','type','initialBalance','institution','accountNumber']);
      return jsonResponse({ ok: true });
    }
    if (action === 'deleteWallet') {
      deleteRowById(ss.getSheetByName(SHEETS.WALLETS), payload.id);
      return jsonResponse({ ok: true });
    }
    if (action === 'upsertBudget') {
      upsertRow(ss.getSheetByName(SHEETS.BUDGETS), payload, ['id','category','limitAmount']);
      return jsonResponse({ ok: true });
    }
    if (action === 'upsertWishlist') {
      upsertRow(ss.getSheetByName(SHEETS.WISHLIST), payload, ['id','title','category','targetAmount','currentAmount','targetDate','walletId','notes']);
      return jsonResponse({ ok: true });
    }
    if (action === 'deleteWishlist') {
      deleteRowById(ss.getSheetByName(SHEETS.WISHLIST), payload.id);
      return jsonResponse({ ok: true });
    }
    return jsonResponse({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function upsertRow(sheet, item, columns) {
  const values = sheet.getDataRange().getValues();
  const rowValues = columns.map(function (c) { return item[c] !== undefined && item[c] !== null ? item[c] : ''; });
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(item.id)) {
      sheet.getRange(i + 1, 1, 1, columns.length).setValues([rowValues]);
      return;
    }
  }
  sheet.appendRow(rowValues);
}

function deleteRowById(sheet, id) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) { sheet.deleteRow(i + 1); return; }
  }
}

function replaceSheetData(sheet, items, columns) {
  if (!sheet || !Array.isArray(items)) return;
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, columns.length).clearContent();
  if (items.length === 0) return;
  const rows = items.map(function (item) {
    return columns.map(function (c) { return item[c] !== undefined && item[c] !== null ? item[c] : ''; });
  });
  sheet.getRange(2, 1, rows.length, columns.length).setValues(rows);
}`;
