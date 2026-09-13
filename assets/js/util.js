/* LAPMS - small shared helpers (no dependencies) */
(function (global) {
  'use strict';

  // ---------- DOM ----------
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    (Array.isArray(children) ? children : children ? [children] : []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    });
    return node;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- Dates ----------
  function iso(d) {
    var dt = (d instanceof Date) ? d : new Date(d);
    return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate());
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { return iso(new Date()); }
  function isWeekend(isoDate) { var d = new Date(isoDate + 'T00:00:00'); return d.getDay() === 0 || d.getDay() === 6; }
  function addDays(isoDate, n) {
    var d = new Date(isoDate + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return iso(d);
  }
  function longDate(isoDate) {
    var d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  function shortDate(isoDate) {
    var d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }
  function relativeDay(isoDate) {
    var t = today();
    if (isoDate === t) return 'Today';
    if (isoDate === addDays(t, -1)) return 'Yesterday';
    return shortDate(isoDate);
  }
  /** Last `count` weekdays up to and including `endIso`, oldest first. */
  function schoolDays(endIso, count) {
    var out = [], cur = endIso;
    while (out.length < count) {
      if (!isWeekend(cur)) out.push(cur);
      cur = addDays(cur, -1);
    }
    return out.reverse();
  }
  function nowTime() {
    var d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  // ---------- Text ----------
  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/);
    return ((parts[0] || '')[0] || '' ).toUpperCase() + ((parts[parts.length - 1] || '')[0] || '').toUpperCase();
  }
  function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : 0; }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  // ---------- Feedback ----------
  function toast(msg) {
    var host = $('.toast-host');
    if (!host) { host = el('div', { class: 'toast-host', 'aria-live': 'polite' }); document.body.appendChild(host); }
    var t = el('div', { class: 'toast', text: msg });
    host.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  function modal(title, bodyNode, opts) {
    opts = opts || {};
    var host = el('div', { class: 'modal-host', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    var box = el('div', { class: 'modal' });
    var close = function () { host.remove(); document.removeEventListener('keydown', onKey); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    box.appendChild(el('div', { class: 'modal-head' }, [
      el('h2', { text: title }),
      el('button', { class: 'btn btn-ghost btn-sm', 'aria-label': 'Close', onclick: close }, '✕')
    ]));
    box.appendChild(bodyNode);
    if (opts.actions) {
      box.appendChild(el('div', { class: 'row', style: 'justify-content:flex-end;margin-top:18px' }, opts.actions(close)));
    }
    host.appendChild(box);
    host.addEventListener('click', function (e) { if (e.target === host) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(host);
    var focusable = box.querySelector('input, select, textarea, button');
    if (focusable) focusable.focus();
    return close;
  }

  function confirmBox(title, message, onYes, yesLabel) {
    modal(title, el('p', { class: 'secondary', style: 'margin:0', text: message }), {
      actions: function (close) {
        return [
          el('button', { class: 'btn', onclick: close }, 'Cancel'),
          el('button', {
            class: 'btn btn-primary',
            onclick: function () { close(); onYes(); }
          }, yesLabel || 'Confirm')
        ];
      }
    });
  }

  function downloadCsv(filename, rows) {
    var csv = rows.map(function (r) {
      return r.map(function (cell) {
        var s = String(cell === null || cell === undefined ? '' : cell);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  /** Deterministic PRNG so the demo dataset is identical on every machine. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  global.U = {
    $: $, $$: $$, el: el, clear: clear, esc: esc,
    iso: iso, pad: pad, today: today, isWeekend: isWeekend, addDays: addDays,
    longDate: longDate, shortDate: shortDate, relativeDay: relativeDay,
    schoolDays: schoolDays, nowTime: nowTime,
    initials: initials, pct: pct, plural: plural,
    toast: toast, modal: modal, confirmBox: confirmBox, downloadCsv: downloadCsv,
    qs: qs, rng: rng
  };
})(window);
