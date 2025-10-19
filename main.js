(() => {
  const dialog = document.getElementById('element-dialog');
  const els = {
    title: document.getElementById('dialog-title'),
    source: document.getElementById('dlg-source'),
  };

  const fields = [
    ['dlg-atomic', d => d.number ?? d.atomic_number],
    ['dlg-symbol', d => d.symbol],
    ['dlg-name', d => d.name],
    ['dlg-summary', d => d.summary ?? d.description],
    ['dlg-category', d => d.category],
    ['dlg-phase', d => d.phase],
    ['dlg-appearance', d => d.appearance],
    ['dlg-mass', d => fmtNum(d.atomic_mass)],
    ['dlg-melt', d => fmtNum(d.melt)],
    ['dlg-boil', d => fmtNum(d.boil)],
    ['dlg-density', d => fmtNum(d.density)],
    ['dlg-molar-heat', d => fmtNum(d.molar_heat)],
    ['dlg-discovered-by', d => d.discovered_by],
    ['dlg-named-by', d => d.named_by],
    ['dlg-electron-config', d => d.electron_configuration || d.electron_configuration_semantic],
    ['dlg-electron-affinity', d => fmtNum(d.electron_affinity)],
    ['dlg-electronegativity', d => fmtNum(d.electronegativity_pauling)],
    ['dlg-ionization-energy', d => Array.isArray(d.ionization_energies) && d.ionization_energies.length ? fmtNum(d.ionization_energies[0]) : null],
    ['dlg-shells', d => Array.isArray(d.shells) ? d.shells.join(', ') : null],
    ['dlg-group', d => d.group],
    ['dlg-period', d => d.period],
    ['dlg-block', d => d.block],
    ['dlg-pos', d => (d.xpos && d.ypos) ? `${d.xpos}, ${d.ypos}` : null],
  ];

  const API = {
    url: 'https://api.apiverve.com/v1/periodictable',
    headers: { 'x-api-key': '29fa188b-b540-4af2-bf0f-b7c7591c3850', 'accept': 'application/json' },
  };

  function fmtNum(n, digits = 2) {
    if (n === undefined || n === null) return '—';
    const num = typeof n === 'number' ? n : Number(n);
    if (!Number.isFinite(num)) return String(n);
    return Number.isInteger(num) ? String(num) : String(num.toFixed(digits));
  }

  function setFields(data) {
    els.title.textContent = data?.name || 'Element Details';
    fields.forEach(([id, getter]) => {
      const el = document.getElementById(id);
      const val = data ? getter(data) : null;
      el.textContent = (val === undefined || val === null || val === '') ? '—' : val;
    });
    if (data?.source) {
      els.source.textContent = 'View Source';
      els.source.href = data.source;
      els.source.target = '_blank';
      els.source.rel = 'noopener noreferrer';
    } else {
      els.source.textContent = '—';
      els.source.removeAttribute('href');
    }
  }

  function setLoading() {
    setFields(null);
    els.title.textContent = 'Loading…';
  }

  async function fetchElement({ symbol, name }) {
    const queries = [];
    if (symbol) queries.push(`symbol=${encodeURIComponent(symbol)}`);
    if (name) queries.push(`name=${encodeURIComponent(name)}`);
    for (const q of queries) {
      const res = await fetch(`${API.url}?${q}`, { headers: API.headers });
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    }
    throw new Error('No element found');
  }

  const closeBtn = dialog.querySelector('.close-btn');
  closeBtn.addEventListener('click', () => dialog.close());

  document.addEventListener('click', async (e) => {
    const box = e.target.closest('.box');
    if (!box) return;
    const symbol = box.querySelector('h1')?.textContent?.trim() || '';
    const name = box.querySelector('h3')?.textContent?.trim() || '';
    dialog.showModal();
    setLoading();
    try {
      const data = await fetchElement({ symbol, name });
      setFields(data);
    } catch (err) {
      els.title.textContent = 'Failed to load';
      console.error(err);
    }
  });

  dialog.addEventListener('click', (e) => {
    const rect = dialog.getBoundingClientRect();
    const inside = (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
    if (!inside) dialog.close();
  });
})();