// Palm Bandits: Client-Logik. Läuft einmal (once) bzw. bei jedem Seitenwechsel (astro:page-load).

const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const norm = (s: string) =>
  s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').normalize('NFKD').replace(/[^\w\s-]/g, ' ');

let timers: number[] = [];
let observers: IntersectionObserver[] = [];

/* ================= EINMALIG ================= */
let booted = false;
function once() {
  if (booted) return;
  booted = true;
  initRadio();
  initSearch();
  initDelegates();
  initParallax();
  addEventListener('scroll', () => $('[data-hdr]')?.classList.toggle('is-scrolled', scrollY > 8), { passive: true });
}

/* ---------- Radio (persistiert über Seitenwechsel) ----------
   Anbieter: youtube | spotify (zählt beim Künstler) | file (lokale Vorschau).
   YouTube/Spotify laden erst nach Klick + Zustimmung (gespeichert nur in diesem Browser). */
declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void; onSpotifyIframeApiReady?: (api: any) => void }
}
const CONSENT_KEY = 'wfm-consent';
const getConsent = () => { try { return localStorage.getItem(CONSENT_KEY) === '1'; } catch { return false; } };
const setConsent = () => { try { localStorage.setItem(CONSENT_KEY, '1'); } catch { /* ignore */ } };
const loadScript = (src: string) => new Promise<void>((res, rej) => {
  const s = document.createElement('script');
  s.src = src; s.async = true; s.onload = () => res(); s.onerror = () => rej(new Error(src));
  document.head.appendChild(s);
});

function initRadio() {
  const box = $('[data-radio]');
  if (!box) return;
  const provider = box.dataset.provider ?? 'file';
  const set = (s: string) => {
    box.dataset.state = s;
    document.documentElement.dataset.radio = s;
  };
  const show = () => box.classList.add('is-visible');

  // --- lokale Datei ---
  const audio = $<HTMLAudioElement>('[data-radio-audio]');
  if (audio) {
    audio.loop = true;
    audio.volume = 0.85;
    audio.addEventListener('play', () => { set('playing'); show(); });
    audio.addEventListener('pause', () => set('paused'));
    audio.addEventListener('timeupdate', () => {
      const p = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      const bar = $('[data-radio-progress]');
      if (bar) bar.style.width = `${p}%`;
    });
  }

  // --- Streaming (YouTube / Spotify) ---
  const embed = $('[data-radio-embed]');
  const consentBox = $('[data-radio-consent]');
  let player: any = null; // YT.Player oder Spotify-Controller
  let loading = false;
  let playing = false;

  async function loadStream() {
    if (player || loading || !embed) return;
    loading = true;
    embed.hidden = false;
    show();
    const mount = embed.querySelector<HTMLElement>('[data-radio-mount]')!;
    if (provider === 'youtube') {
      box!.classList.add('has-video');
      await new Promise<void>((resolve) => {
        if (window.YT?.Player) return resolve();
        window.onYouTubeIframeAPIReady = () => resolve();
        loadScript('https://www.youtube.com/iframe_api').catch(() => resolve());
      });
      player = new window.YT.Player(mount, {
        host: 'https://www.youtube-nocookie.com',
        videoId: box!.dataset.youtube,
        width: '100%',
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin },
        events: {
          onReady: (e: any) => e.target.playVideo(),
          onStateChange: (e: any) => { playing = e.data === 1; set(playing ? 'playing' : 'paused'); },
        },
      });
    } else if (provider === 'spotify') {
      await new Promise<void>((resolve) => {
        window.onSpotifyIframeApiReady = (api: any) => {
          api.createController(mount, { uri: box!.dataset.spotify, width: '100%', height: 152 }, (ctrl: any) => {
            player = ctrl;
            ctrl.addListener('ready', () => ctrl.play());
            ctrl.addListener('playback_update', (ev: any) => { playing = !ev.data.isPaused; set(playing ? 'playing' : 'paused'); });
            resolve();
          });
        };
        loadScript('https://open.spotify.com/embed/iframe-api/v1').catch(() => resolve());
      });
    }
    loading = false;
  }

  function toggleStream() {
    if (!player) {
      if (getConsent()) loadStream();
      else if (consentBox) { consentBox.hidden = false; show(); }
      return;
    }
    if (provider === 'youtube') playing ? player.pauseVideo() : player.playVideo();
    else player.togglePlay();
  }

  document.addEventListener('click', (e) => {
    const el = e.target as Element;
    if (el.closest('[data-radio-accept]')) { setConsent(); if (consentBox) consentBox.hidden = true; loadStream(); return; }
    if (el.closest('[data-radio-decline]')) { if (consentBox) consentBox.hidden = true; return; }
    const t = el.closest('[data-radio-toggle]');
    if (!t) return;
    e.preventDefault();
    if (provider === 'file' && audio) { audio.paused ? audio.play().catch(() => {}) : audio.pause(); }
    else toggleStream();
  });

  const reveal = () => {
    if (scrollY > 700 && matchMedia('(min-width: 861px)').matches) {
      show();
      removeEventListener('scroll', reveal);
    }
  };
  addEventListener('scroll', reveal, { passive: true });
}

/* ---------- Suche ---------- */
type Hit = { t: string; d: string; u: string; k: string; x?: string };
function initSearch() {
  const box = $('[data-search]');
  const input = $<HTMLInputElement>('[data-search-input]');
  const out = $('[data-search-results]');
  if (!box || !input || !out) return;
  let index: (Hit & { n: string })[] | null = null;
  let sel = 0;
  const hint = out.innerHTML;

  const load = async () => {
    if (index) return index;
    const r = await fetch(box!.dataset.index || '/search.json');
    const data: Hit[] = await r.json();
    index = data.map((h) => ({ ...h, n: norm(`${h.t} ${h.d} ${h.x ?? ''}`) }));
    return index;
  };
  const open = () => {
    box.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 10);
    load();
  };
  const close = () => {
    box.hidden = true;
    document.documentElement.style.overflow = '';
  };
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

  const render = async () => {
    const q = norm(input.value).trim();
    if (!q) { out.innerHTML = hint; return; }
    const idx = await load();
    const toks = q.split(/\s+/).filter(Boolean);
    const scored = idx
      .map((h) => {
        let s = 0;
        const t = norm(h.t);
        for (const tok of toks) {
          if (!h.n.includes(tok)) return { h, s: -1 };
          if (t.includes(tok)) s += 3;
          if (t.startsWith(tok)) s += 2;
          if ((h.x ?? '').toLowerCase() === tok) s += 10;
        }
        return { h, s };
      })
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 14);
    sel = 0;
    out.innerHTML = scored.length
      ? scored
          .map(
            ({ h }, i) =>
              `<a href="${h.u}" class="${i === 0 ? 'is-sel' : ''}"><span class="sr-type">${esc(h.k)}</span><span class="sr-main"><b>${esc(h.t)}</b><small>${esc(h.d)}</small></span></a>`,
          )
          .join('')
      : `<p class="srch__hint muted">${esc(box!.dataset.none || 'Nichts gefunden für')} „${esc(input.value)}“. ${esc(box!.dataset.other || '')}</p>`;
  };

  let deb: number;
  input.addEventListener('input', () => { clearTimeout(deb); deb = window.setTimeout(render, 70); });
  input.addEventListener('keydown', (e) => {
    const items = $$('a', out);
    if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      items[sel]?.classList.remove('is-sel');
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[sel].classList.add('is-sel');
      items[sel].scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter') { e.preventDefault(); items[sel]?.click(); }
  });
  document.addEventListener('click', (e) => {
    const el = e.target as Element;
    if (el.closest('[data-search-open]')) { e.preventDefault(); open(); }
    else if (el.closest('[data-search-close]')) close();
    else if (el.closest('[data-search-results] a')) close();
  });
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test((e.target as Element).tagName);
    if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); open(); }
    if (e.key === 'Escape' && !box.hidden) close();
  });
}

/* ---------- Event-Delegation (Spotlight, Tilt, Kopieren, Teilen, Formulare) ---------- */
function initDelegates() {
  document.addEventListener('pointermove', (e) => {
    const card = (e.target as Element).closest<HTMLElement>('.card');
    if (card) {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }
    const tilt = (e.target as Element).closest<HTMLElement>('[data-tilt]');
    if (tilt && !reduced && e.pointerType === 'mouse') {
      const r = tilt.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-4px)`;
    }
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const tilt = (e.target as Element).closest<HTMLElement>('[data-tilt]');
    if (tilt && !tilt.contains(e.relatedTarget as Node)) tilt.style.transform = '';
  });

  document.addEventListener('click', async (e) => {
    const el = e.target as Element;
    const copy = el.closest<HTMLElement>('[data-copy]');
    if (copy) {
      e.preventDefault();
      try { await navigator.clipboard.writeText(copy.dataset.copy!); } catch { /* ignore */ }
      copy.classList.add('is-copied');
      setTimeout(() => copy.classList.remove('is-copied'), 1400);
    }
    const share = el.closest<HTMLElement>('[data-share]');
    if (share) {
      e.preventDefault();
      const data = { title: document.title, url: location.href };
      if (navigator.share) navigator.share(data).catch(() => {});
      else { await navigator.clipboard.writeText(location.href).catch(() => {}); share.classList.add('is-copied'); setTimeout(() => share.classList.remove('is-copied'), 1400); }
    }
    const faq = el.closest<HTMLElement>('[data-acc] > button');
    if (faq) {
      const item = faq.parentElement!;
      item.classList.toggle('is-open');
      faq.setAttribute('aria-expanded', String(item.classList.contains('is-open')));
    }
  });

  document.addEventListener('submit', (e) => {
    const f = (e.target as HTMLElement).closest<HTMLFormElement>('[data-demo-form]');
    if (!f) return;
    e.preventDefault();
    const msg = f.querySelector<HTMLElement>('[data-form-msg]');
    if (msg) msg.textContent = 'Danke! Du stehst auf der Liste. (Prototyp: Anbindung an den Newsletter-Dienst folgt.)';
    f.reset();
  });
}

/* ---------- Hero-Parallax ---------- */
function initParallax() {
  if (reduced) return;
  let px = 0, py = 0, tx = 0, ty = 0, raf = 0;
  addEventListener('pointermove', (e) => {
    tx = e.clientX / innerWidth - 0.5;
    ty = e.clientY / innerHeight - 0.5;
    if (!raf) raf = requestAnimationFrame(tick);
  }, { passive: true });
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  function tick() {
    raf = 0;
    px += (tx - px) * 0.08;
    py += (ty - py) * 0.08;
    const layers = $$('[data-depth]');
    if (!layers.length) return;
    const sy = scrollY;
    for (const l of layers) {
      const d = parseFloat(l.dataset.depth!);
      l.style.transform = `translate3d(${-px * d * 60}px, ${-py * d * 30 + sy * d * 0.35}px, 0)`;
    }
    if (Math.abs(tx - px) > 0.001 || Math.abs(ty - py) > 0.001) raf = requestAnimationFrame(tick);
  }
}

/* ================= PRO SEITE ================= */
function page() {
  timers.forEach(clearInterval);
  timers = [];
  observers.forEach((o) => o.disconnect());
  observers = [];

  $('[data-hdr]')?.classList.toggle('is-scrolled', scrollY > 8);

  // Mobile Menü
  const menu = $('[data-menu]');
  const openBtn = $('[data-menu-open]');
  const closeMenu = () => { if (menu) menu.hidden = true; document.documentElement.style.overflow = ''; openBtn?.setAttribute('aria-expanded', 'false'); };
  openBtn?.addEventListener('click', () => {
    if (!menu) return;
    menu.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    openBtn.setAttribute('aria-expanded', 'true');
  });
  $('[data-menu-close]')?.addEventListener('click', closeMenu);
  menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

  // Reveal beim Scrollen
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }),
    { rootMargin: '0px 0px -8% 0px' },
  );
  observers.push(io);
  $$('[data-reveal]').forEach((el) => io.observe(el));

  // Relative Zeiten ("vor 12 Min.")
  const en = document.documentElement.lang === 'en';
  const rel = () => {
    const now = Date.now();
    $$('time[data-rel]').forEach((t) => {
      const d = new Date(t.getAttribute('datetime')!).getTime();
      const m = Math.round((now - d) / 60000);
      const days = Math.round(m / 1440);
      let s: string;
      if (m < 1) s = en ? 'just now' : 'gerade eben';
      else if (m < 60) s = en ? `${m} min ago` : `vor ${m} Min.`;
      else if (m < 60 * 24) s = en ? `${Math.round(m / 60)} h ago` : `vor ${Math.round(m / 60)} Std.`;
      else if (m < 60 * 24 * 7) s = en ? `${days} ${days === 1 ? 'day' : 'days'} ago` : `vor ${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
      else s = new Date(d).toLocaleDateString(en ? 'en-GB' : 'de-DE', { day: '2-digit', month: 'short' });
      t.textContent = s;
    });
  };
  rel();
  timers.push(window.setInterval(rel, 60000));

  // Countdown
  $$('[data-countdown]').forEach((el) => {
    const target = new Date(el.dataset.countdown!).getTime();
    const parts = {
      d: el.querySelector<HTMLElement>('[data-cd="d"]'),
      h: el.querySelector<HTMLElement>('[data-cd="h"]'),
      m: el.querySelector<HTMLElement>('[data-cd="m"]'),
      s: el.querySelector<HTMLElement>('[data-cd="s"]'),
    };
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { el.classList.add('is-live'); return; }
      const d = Math.floor(diff / 864e5), h = Math.floor((diff / 36e5) % 24), m = Math.floor((diff / 6e4) % 60), s = Math.floor((diff / 1e3) % 60);
      const pad = (n: number) => String(n).padStart(2, '0');
      if (parts.d) parts.d.textContent = pad(d);
      if (parts.h) parts.h.textContent = pad(h);
      if (parts.m) parts.m.textContent = pad(m);
      if (parts.s) parts.s.textContent = pad(s);
    };
    tick();
    timers.push(window.setInterval(tick, 1000));
  });

  // Filter (News, Guides, Cheats)
  $$('[data-filter-group]').forEach((group) => {
    const btns = $$('[data-filter]', group);
    const items = $$('[data-filter-item]', group);
    const search = $<HTMLInputElement>('[data-filter-search]', group);
    const count = $('[data-filter-count]', group);
    const empty = $('[data-filter-empty]', group);
    let active = 'alle';
    const apply = () => {
      const q = search ? norm(search.value).trim() : '';
      let n = 0;
      items.forEach((it) => {
        const okCat = active === 'alle' || (it.dataset.tags ?? '').split(' ').includes(active);
        const okQ = !q || norm(it.dataset.text ?? it.textContent ?? '').includes(q);
        const show = okCat && okQ;
        it.hidden = !show;
        if (show) n++;
      });
      if (count) count.textContent = String(n);
      if (empty) empty.hidden = n > 0;
    };
    btns.forEach((b) =>
      b.addEventListener('click', () => {
        active = b.dataset.filter!;
        btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        apply();
      }),
    );
    search?.addEventListener('input', apply);
    // Filter aus URL (?spiel=gta-6)
    const pre = new URLSearchParams(location.search).get('filter');
    if (pre) btns.find((b) => b.dataset.filter === pre)?.click();
  });
}

once();
document.addEventListener('astro:page-load', page);
// Nach Seitenwechsel ersetzt der Router die <html>-Attribute: Zustand wiederherstellen
document.addEventListener('astro:after-swap', () => {
  const html = document.documentElement;
  html.classList.add('js');
  const radio = $('[data-radio]');
  if (radio) html.dataset.radio = radio.dataset.state ?? 'idle';
  html.style.overflow = '';
});
export {};
