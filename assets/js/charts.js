/* ==========================================================================
   LAPMS - chart components

   Built in plain HTML/CSS. Design rules applied:
     - one axis, thin marks, 4px rounded data-ends anchored to the baseline
     - 2px surface gap between adjacent fills in a stack
     - status colour never carries meaning alone: every legend entry and every
       tooltip row pairs the swatch with an icon and a label
     - the status fills warning (#fab219) and serious (#ec835a) sit below 3:1
       on the light surface, so every chart ships direct labels AND a table view
     - stack order present -> late -> absent -> excused -> activity is the order
       validated for colour-vision separation; do not reorder it
   ========================================================================== */
(function (global) {
  'use strict';

  var el = U.el;

  var STACK_ORDER = ['present', 'late', 'absent', 'excused', 'activity', 'unmarked'];
  var SEG_META = {
    present:  { label: 'Present',  icon: '✓', cls: 'seg-present',  swatch: 'var(--good)' },
    late:     { label: 'Late',     icon: '◴', cls: 'seg-late',     swatch: 'var(--warning)' },
    absent:   { label: 'Absent',   icon: '✕', cls: 'seg-absent',   swatch: 'var(--critical)' },
    excused:  { label: 'Excused',  icon: '✉', cls: 'seg-excused',  swatch: 'var(--serious)' },
    activity: { label: 'School activity', icon: '⚑', cls: 'seg-activity', swatch: 'var(--accent)' },
    unmarked: { label: 'Not marked', icon: '–', cls: 'seg-unmarked', swatch: 'var(--border-strong)' }
  };

  // ---------- Tooltip (one shared instance) ----------
  var tip;
  function tipNode() {
    if (!tip) { tip = el('div', { class: 'viz-tip', role: 'status' }); document.body.appendChild(tip); }
    return tip;
  }
  function showTip(evt, title, rows) {
    var t = tipNode();
    U.clear(t);
    t.appendChild(el('div', { class: 'viz-tip-title', text: title }));
    (rows || []).forEach(function (r) {
      t.appendChild(el('div', { class: 'viz-tip-row' }, [
        r.swatch ? el('span', { class: 'legend-swatch', style: 'background:' + r.swatch }) : null,
        el('span', { text: (r.icon ? r.icon + ' ' : '') + r.label }),
        el('b', { style: 'margin-left:auto', text: String(r.value) })
      ]));
    });
    t.classList.add('on');
    moveTip(evt);
  }
  function moveTip(evt) {
    var t = tipNode();
    var x = evt.clientX + 14, y = evt.clientY + 16;
    var r = t.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - 14;
    if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - 16;
    t.style.left = Math.max(8, x) + 'px';
    t.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { if (tip) tip.classList.remove('on'); }

  function bindTip(node, title, rows) {
    node.addEventListener('mouseenter', function (e) { showTip(e, title, rows); });
    node.addEventListener('mousemove', moveTip);
    node.addEventListener('mouseleave', hideTip);
    node.setAttribute('tabindex', '0');
    node.addEventListener('focus', function (e) {
      var r = node.getBoundingClientRect();
      showTip({ clientX: r.left, clientY: r.bottom }, title, rows);
    });
    node.addEventListener('blur', hideTip);
  }

  // ---------- Table view (the relief for low-contrast fills) ----------
  function attachTable(container, headers, rows) {
    var wrap = el('div', { class: 'viz-table', hidden: true });
    var table = el('table', { class: 'data' });
    var thead = el('thead');
    thead.appendChild(el('tr', null, headers.map(function (h, i) {
      return el('th', { class: i ? 'num' : '', text: h });
    })));
    var tbody = el('tbody');
    rows.forEach(function (r) {
      tbody.appendChild(el('tr', null, r.map(function (c, i) {
        return el('td', { class: i ? 'num' : '', text: String(c) });
      })));
    });
    table.appendChild(thead); table.appendChild(tbody);
    wrap.appendChild(table);

    var btn = el('button', { class: 'viz-table-toggle', type: 'button' }, 'Table view');
    btn.addEventListener('click', function () {
      wrap.hidden = !wrap.hidden;
      btn.textContent = wrap.hidden ? 'Table view' : 'Hide table';
      btn.setAttribute('aria-expanded', String(!wrap.hidden));
    });
    return { toggle: btn, table: wrap };
  }

  // ---------- Legend ----------
  function legend(items) {
    return el('div', { class: 'legend' }, items.map(function (it) {
      return el('span', { class: 'legend-item' }, [
        el('span', { class: 'legend-swatch', style: 'background:' + it.swatch }),
        el('span', { class: 'legend-icon', 'aria-hidden': 'true', text: it.icon }),
        el('span', { text: it.label + (it.value !== undefined ? ' · ' + it.value : '') })
      ]);
    }));
  }

  // ==========================================================================
  // Stat tiles - a hero number needs no plot
  // ==========================================================================
  function statRow(tiles) {
    return el('div', { class: 'stat-row' }, tiles.map(function (t) {
      return el('div', { class: 'stat' + (t.tone ? ' stat-' + t.tone : '') }, [
        el('span', { class: 'stat-accent-bar', 'aria-hidden': 'true' }),
        el('div', { class: 'stat-label' }, [
          t.icon ? el('span', { 'aria-hidden': 'true', text: t.icon }) : null,
          el('span', { text: t.label })
        ]),
        el('div', { class: 'stat-value', text: String(t.value) }),
        t.meta ? el('div', { class: 'stat-meta', text: t.meta }) : null
      ]);
    }));
  }

  // ==========================================================================
  // Horizontal bars - one series, so no legend box; the title names it
  // ==========================================================================
  function barList(opts) {
    var rows = opts.rows || [];
    var max = opts.max || Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    var host = el('div', { class: 'viz-root' });
    var bars = el('div', { class: 'bars' });

    rows.forEach(function (r) {
      var w = max ? Math.max(0, (r.value / max) * 100) : 0;
      var track = el('div', { class: 'bar-track' });
      var fill = el('div', { class: 'bar-fill', style: 'width:' + w + '%' });
      track.appendChild(fill);
      bindTip(track, r.name, [{ label: opts.seriesLabel || 'Value', value: r.display || r.value, swatch: 'var(--series-1)' }]
        .concat(r.tipRows || []));
      bars.appendChild(el('div', { class: 'bar-row' }, [
        el('span', { class: 'bar-name', title: r.name, text: r.name }),
        track,
        el('span', { class: 'bar-value', text: r.display !== undefined ? r.display : String(r.value) })
      ]));
    });

    host.appendChild(bars);
    if (opts.table !== false) {
      var t = attachTable(host, [opts.nameHeader || 'Item', opts.seriesLabel || 'Value'],
        rows.map(function (r) { return [r.name, r.display !== undefined ? r.display : r.value]; }));
      host.appendChild(el('div', { class: 'row', style: 'margin-top:14px' }, [t.toggle]));
      host.appendChild(t.table);
    }
    return host;
  }

  // ==========================================================================
  // Stacked status rows
  // ==========================================================================
  function stackedRows(opts) {
    var rows = opts.rows || [];
    var keys = (opts.keys || STACK_ORDER).filter(function (k) {
      return rows.some(function (r) { return (r.counts[k] || 0) > 0; });
    });
    var host = el('div', { class: 'viz-root' });
    var body = el('div', { class: 'bars' });

    rows.forEach(function (r) {
      var total = keys.reduce(function (a, k) { return a + (r.counts[k] || 0); }, 0);
      var bar = el('div', { class: 'stack-bar' });
      if (!total) {
        bar.appendChild(el('div', { class: 'stack-seg seg-unmarked', style: 'flex:1' },
          el('span', { class: 'stack-seg-label', style: 'color:var(--text-muted);text-shadow:none', text: 'No record' })));
      } else {
        keys.forEach(function (k) {
          var v = r.counts[k] || 0;
          if (!v) return;
          var share = (v / total) * 100;
          var meta = SEG_META[k];
          var seg = el('div', { class: 'stack-seg ' + meta.cls, style: 'flex:' + v + ' 0 auto' });
          // Direct label whenever the segment can hold it
          if (share >= 9) seg.appendChild(el('span', { class: 'stack-seg-label', text: String(v) }));
          bindTip(seg, r.name, [{
            label: meta.label, icon: meta.icon, value: v + '  (' + U.pct(v, total) + '%)', swatch: meta.swatch
          }]);
          bar.appendChild(seg);
        });
      }
      body.appendChild(el('div', { class: 'stack-row' }, [
        el('span', { class: 'bar-name', title: r.name, text: r.name }),
        bar,
        el('span', { class: 'bar-value', text: r.display !== undefined ? r.display : String(total) })
      ]));
    });

    host.appendChild(body);
    host.appendChild(legend(keys.map(function (k) {
      return { label: SEG_META[k].label, icon: SEG_META[k].icon, swatch: SEG_META[k].swatch };
    })));

    var headers = [opts.nameHeader || 'Class'].concat(keys.map(function (k) { return SEG_META[k].label; }));
    var trows = rows.map(function (r) {
      return [r.name].concat(keys.map(function (k) { return r.counts[k] || 0; }));
    });
    var t = attachTable(host, headers, trows);
    host.appendChild(el('div', { class: 'row', style: 'margin-top:12px' }, [t.toggle]));
    host.appendChild(t.table);
    return host;
  }

  // ==========================================================================
  // Donut - a single share, with the headline number in the middle
  // ==========================================================================
  function donut(opts) {
    var segments = (opts.segments || []).filter(function (s) { return s.value > 0; });
    var total = segments.reduce(function (a, s) { return a + s.value; }, 0) || 1;
    var stops = [], acc = 0;
    segments.forEach(function (s) {
      var from = (acc / total) * 360;
      acc += s.value;
      var to = (acc / total) * 360;
      var colour = SEG_META[s.key] ? SEG_META[s.key].swatch : 'var(--series-1)';
      stops.push(colour + ' ' + from + 'deg ' + to + 'deg');
    });

    var ring = el('div', {
      class: 'donut',
      style: 'border-radius:50%;background:conic-gradient(' + (stops.join(',') || 'var(--surface-sunken) 0deg 360deg') + ')'
    });
    var hole = el('div', {
      style: 'position:absolute;inset:17px;border-radius:50%;background:var(--surface-1)'
    });
    ring.appendChild(hole);
    ring.appendChild(el('div', { class: 'donut-center' }, el('div', null, [
      el('div', { class: 'n', text: opts.headline }),
      el('div', { class: 'l', text: opts.headlineLabel || '' })
    ])));

    var items = segments.map(function (s) {
      var meta = SEG_META[s.key] || { label: s.label, icon: '•', swatch: 'var(--series-1)' };
      return { label: meta.label, icon: meta.icon, swatch: meta.swatch, value: s.value };
    });

    var host = el('div', { class: 'viz-root' });
    host.appendChild(el('div', { class: 'donut-wrap' }, [ring, el('div', { class: 'grow' }, legend(items))]));

    var t = attachTable(host, ['Status', 'Learners'], items.map(function (i) { return [i.label, i.value]; }));
    host.appendChild(el('div', { class: 'row', style: 'margin-top:12px' }, [t.toggle]));
    host.appendChild(t.table);
    return host;
  }

  global.Charts = {
    statRow: statRow,
    barList: barList,
    stackedRows: stackedRows,
    donut: donut,
    legend: legend,
    SEG_META: SEG_META,
    STACK_ORDER: STACK_ORDER
  };
})(window);
