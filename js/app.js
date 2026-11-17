/*
 * Japanese Flashcards — all app logic.
 *
 * Data model (everything lives in `state` and is saved to localStorage):
 *   decks[id]    { id, name, description, order, updatedAt, deleted? }
 *   cards[id]    { id, deckId, front, reading, back, notes, order, updatedAt, deleted? }
 *   progress[id] { ease, interval, reps, lapses, due, lastReviewed, updatedAt }  (keyed by card id)
 *   log[date]    { count, updatedAt }  (reviews per day, for the streak)
 *   prefs        { newPerSession, direction, readingOnFront, autoSpeak, updatedAt }
 *
 * Every record carries `updatedAt`, and deletions are kept as "tombstones"
 * (deleted: true). That lets two computers merge their data safely: for each
 * record, the most recently changed version wins.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'jpFlashcards.data.v1';
  var SYNC_KEY = 'jpFlashcards.sync.v1';
  var GIST_FILE = 'japanese-flashcards-data.json';
  var COLLECTIONS = ['decks', 'cards', 'progress', 'log'];
  var DAY = 86400000;
  var MASTERED_DAYS = 21;
  var DEFAULT_PREFS = { newPerSession: 15, direction: 'jp-en', readingOnFront: false, autoSpeak: false, updatedAt: 0 };

  // ------------------------------------------------------------------ utils
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function now() { return Date.now(); }
  function uid(prefix) { return (prefix || '') + now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function assign(t) { for (var i = 1; i < arguments.length; i++) { var s = arguments[i]; if (s) for (var k in s) t[k] = s[k]; } return t; }
  function values(o) { return Object.keys(o || {}).map(function (k) { return o[k]; }); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function dayKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function startOfDay(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function fmtDuration(ms) {
    var m = ms / 60000;
    if (m < 60) return Math.max(1, Math.round(m)) + 'm';
    var h = m / 60;
    if (h < 24) return Math.round(h) + 'h';
    var d = h / 24;
    if (d < 30) return Math.round(d) + 'd';
    if (d < 365) return (d / 30).toFixed(d < 300 ? 1 : 0).replace(/\.0$/, '') + 'mo';
    return (d / 365).toFixed(1).replace(/\.0$/, '') + 'y';
  }
  function fmtAgo(t) {
    if (!t) return 'never';
    var s = (now() - t) / 1000;
    if (s < 45) return 'just now';
    return fmtDuration(s * 1000) + ' ago';
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  var toastTimer;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2600);
  }

  // ------------------------------------------------------------------ state
  function emptyState() {
    return { decks: {}, cards: {}, progress: {}, log: {}, prefs: assign({}, DEFAULT_PREFS) };
  }

  // Default decks get fixed ids and updatedAt 0, so every computer creates
  // identical records and any real edit (updatedAt > 0) always wins a merge.
  function seedState() {
    var s = emptyState();
    (window.DEFAULT_DECKS || []).forEach(function (d, di) {
      s.decks[d.id] = { id: d.id, name: d.name, description: d.description || '', order: di, updatedAt: 0 };
      d.cards.forEach(function (c, i) {
        var id = d.id + '-' + i;
        s.cards[id] = { id: id, deckId: d.id, front: c[0], reading: c[1] || '', back: c[2] || '', notes: c[3] || '', order: i, updatedAt: 0 };
      });
    });
    return s;
  }

  // Copy every record from `source` that is newer than the one in `target`.
  // Returns how many records changed in `target`.
  function mergeInto(target, source) {
    var n = 0;
    COLLECTIONS.forEach(function (col) {
      var src = (source && source[col]) || {};
      var tgt = target[col] || (target[col] = {});
      Object.keys(src).forEach(function (k) {
        var a = tgt[k], b = src[k];
        if (!b || typeof b !== 'object') return;
        if (!a || (b.updatedAt || 0) > (a.updatedAt || 0)) { tgt[k] = b; n++; }
      });
    });
    var sp = source && source.prefs;
    if (!target.prefs) target.prefs = assign({}, DEFAULT_PREFS);
    if (sp && (sp.updatedAt || 0) > (target.prefs.updatedAt || 0)) { target.prefs = assign({}, DEFAULT_PREFS, sp); n++; }
    return n;
  }

  function loadState() {
    var s = emptyState();
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved === 'object') mergeInto(s, saved);
    } catch (e) { console.warn('Could not read saved data', e); }
    mergeInto(s, seedState()); // adds any default cards this computer has never seen
    s.prefs = assign({}, DEFAULT_PREFS, s.prefs);
    return s;
  }

  function snapshot() {
    return {
      app: 'japanese-flashcards', version: 1, savedAt: now(),
      decks: state.decks, cards: state.cards, progress: state.progress, log: state.log, prefs: state.prefs
    };
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot())); }
    catch (e) { console.error(e); toast('Could not save to this browser (storage full or blocked).'); }
  }

  // Call after every user change: saves locally and queues a sync.
  function commit() { persist(); Sync.schedule(); }

  var state = loadState();

  function isLiveDeck(id) { var d = state.decks[id]; return !!d && !d.deleted; }
  function liveDecks() {
    return values(state.decks).filter(function (d) { return !d.deleted; }).sort(function (a, b) {
      return (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name);
    });
  }
  function liveCards(deckId) {
    return values(state.cards).filter(function (c) {
      return !c.deleted && isLiveDeck(c.deckId) && (!deckId || c.deckId === deckId);
    }).sort(function (a, b) {
      var da = state.decks[a.deckId].order || 0, db = state.decks[b.deckId].order || 0;
      return da - db || (a.order || 0) - (b.order || 0);
    });
  }

  // ------------------------------------------------------------------ spaced repetition (simplified SM-2)
  function isSeen(id) { var p = state.progress[id]; return !!(p && p.lastReviewed); }

  function cardStatus(id, t) {
    var p = state.progress[id];
    if (!p || !p.lastReviewed) return 'new';
    if (p.due <= (t || now())) return 'due';
    if (p.interval >= MASTERED_DAYS) return 'mastered';
    return 'learning';
  }

  // rating: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
  function schedule(p0, rating, t) {
    var p = assign({ ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0 }, p0);
    if (!p.lastReviewed) { p.ease = 2.5; p.interval = 0; p.reps = 0; }
    if (rating === 1) {
      if (p.reps > 0) p.lapses++;
      p.reps = 0; p.interval = 0;
      p.ease = Math.max(1.3, p.ease - 0.2);
      p.due = t + 10 * 60000;
    } else {
      if (rating === 2) {
        p.ease = Math.max(1.3, p.ease - 0.15);
        p.interval = p.reps === 0 ? 0.5 : Math.max(1, p.interval * 1.2);
      } else if (rating === 3) {
        p.interval = p.reps === 0 ? 1 : p.reps === 1 ? 3 : Math.max(p.interval + 1, p.interval * p.ease);
      } else {
        p.ease += 0.15;
        p.interval = p.reps === 0 ? 4 : Math.max(p.interval + 2, p.interval * p.ease * 1.3);
      }
      if (p.interval >= 1) {
        p.interval = Math.round(p.interval);
        p.due = startOfDay(t + p.interval * DAY); // due at the start of that day
      } else {
        p.due = t + p.interval * DAY;
      }
      p.reps++;
    }
    p.lastReviewed = t;
    p.updatedAt = t;
    return p;
  }

  function previewInterval(id, rating) {
    var t = now();
    var p = schedule(state.progress[id], rating, t);
    if (rating === 1) return '10m';
    return p.interval < 1 ? fmtDuration(p.interval * DAY) : fmtDuration(p.interval * DAY);
  }

  function deckStats(deckId) {
    var t = now(), s = { total: 0, fresh: 0, due: 0, learning: 0, mastered: 0 };
    liveCards(deckId).forEach(function (c) {
      s.total++;
      var p = state.progress[c.id];
      if (!p || !p.lastReviewed) { s.fresh++; return; }
      if (p.due <= t) s.due++;
      if (p.interval >= MASTERED_DAYS) s.mastered++; else s.learning++;
    });
    return s;
  }

  function logReview() {
    var k = dayKey();
    var prev = state.log[k];
    state.log[k] = { count: ((prev && prev.count) || 0) + 1, updatedAt: now() };
  }

  function streak() {
    var d = new Date(), n = 0;
    if (!(state.log[dayKey(d)] || {}).count) d.setDate(d.getDate() - 1);
    while ((state.log[dayKey(d)] || {}).count) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ------------------------------------------------------------------ study session
  var session = null;

  function buildQueue(deckIds, mode, extraNew) {
    var cards = liveCards().filter(function (c) { return deckIds.indexOf(c.deckId) !== -1; });
    if (mode === 'cram') return shuffle(cards.map(function (c) { return c.id; }));
    var t = now();
    var due = cards.filter(function (c) { var p = state.progress[c.id]; return p && p.lastReviewed && p.due <= t; });
    var fresh = cards.filter(function (c) { return !isSeen(c.id); })
      .slice(0, extraNew || state.prefs.newPerSession);
    return shuffle(due.map(function (c) { return c.id; })).concat(fresh.map(function (c) { return c.id; }));
  }

  function startSession(deckIds, mode, extraNew) {
    var queue = buildQueue(deckIds, mode, extraNew);
    if (!queue.length) {
      var msg = mode === 'cram' ? 'This deck has no cards yet.' : 'Nothing to study right now — try "Practice" to review anyway.';
      toast(msg);
      return;
    }
    session = { deckIds: deckIds, mode: mode, queue: queue, total: queue.length, done: 0, again: 0, flipped: false, dir: null };
    if (location.hash === '#/study') render(); else location.hash = '#/study';
  }

  function currentCard() { return session && session.queue.length ? state.cards[session.queue[0]] : null; }

  function flip() {
    if (!session || session.flipped || !currentCard()) return;
    session.flipped = true;
    var el = $('#flashcard');
    if (el) el.classList.add('flipped');
    renderStudyActions();
    if (state.prefs.autoSpeak && session.dir === 'en-jp') speak(currentCard());
  }

  function rate(r) {
    if (!session || !session.flipped) return;
    var id = session.queue[0];
    var card = state.cards[id];
    if (!card) { session.queue.shift(); render(); return; }
    if (session.mode === 'review') state.progress[id] = schedule(state.progress[id], r, now());
    logReview();
    commit();
    session.queue.shift();
    if (r === 1) {
      var pos = Math.min(session.queue.length, 3 + Math.floor(Math.random() * 3));
      session.queue.splice(pos, 0, id);
      session.again++;
    } else {
      session.done++;
    }
    session.flipped = false;
    session.dir = null;
    renderStudy();
  }

  // ------------------------------------------------------------------ speech
  function speak(card) {
    if (!card) return;
    if (!('speechSynthesis' in window)) { toast('Audio is not supported in this browser.'); return; }
    var text = card.front;
    var synth = window.speechSynthesis;
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.85;
    var voice = synth.getVoices().filter(function (v) { return /^ja/i.test(v.lang || ''); })[0];
    if (voice) u.voice = voice;
    synth.speak(u);
  }

  // ------------------------------------------------------------------ sync (GitHub Gist)
  var Sync = {
    cfg: (function () { try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (e) { return {}; } })(),
    status: 'off',
    error: '',
    timer: null,
    pendingSince: 0,
    running: false,
    rerun: false,

    enabled: function () { return !!this.cfg.token; },
    saveCfg: function () { try { localStorage.setItem(SYNC_KEY, JSON.stringify(this.cfg)); } catch (e) { /* ignore */ } },
    setStatus: function (s, err) { this.status = s; this.error = err || ''; renderSyncPill(); renderSyncSection(); },

    api: function (path, opts) {
      opts = opts || {};
      var headers = { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + this.cfg.token };
      if (opts.body) headers['Content-Type'] = 'application/json';
      return fetch('https://api.github.com' + path, {
        method: opts.method || 'GET', headers: headers, cache: 'no-store',
        body: opts.body ? JSON.stringify(opts.body) : undefined
      }).then(function (res) {
        if (!res.ok) {
          var msg = 'GitHub returned an error (' + res.status + ').';
          if (res.status === 401) msg = 'GitHub rejected the token. It may be mistyped or expired — create a new one and reconnect.';
          else if (res.status === 403 || res.status === 429) msg = 'GitHub refused the request. Make sure the token has the "gist" permission, or wait a minute (rate limit).';
          else if (res.status === 404) msg = 'Sync file not found.';
          var e = new Error(msg); e.status = res.status; throw e;
        }
        return res.status === 204 ? null : res.json();
      }, function () {
        throw new Error('Could not reach GitHub. Check your internet connection.');
      });
    },

    findGist: function () {
      var self = this;
      function page(n) {
        return self.api('/gists?per_page=100&page=' + n).then(function (list) {
          for (var i = 0; i < list.length; i++) if (list[i].files && list[i].files[GIST_FILE]) return list[i].id;
          return list.length === 100 && n < 10 ? page(n + 1) : null;
        });
      }
      return page(1);
    },

    readRemote: function () {
      return this.api('/gists/' + this.cfg.gistId).then(function (g) {
        var f = g.files && g.files[GIST_FILE];
        if (!f) return null;
        var text = f.truncated ? fetch(f.raw_url, { cache: 'no-store' }).then(function (r) { return r.text(); }) : f.content;
        return Promise.resolve(text).then(function (t) {
          try { var data = JSON.parse(t); return data && typeof data === 'object' ? data : null; }
          catch (e) { console.warn('Sync file is not valid JSON; it will be overwritten.'); return null; }
        });
      });
    },

    push: function (create) {
      var files = {}; files[GIST_FILE] = { content: JSON.stringify(snapshot()) };
      if (create) {
        return this.api('/gists', {
          method: 'POST',
          body: { description: 'Japanese Flashcards — sync data (managed by the flashcard app)', public: false, files: files }
        });
      }
      return this.api('/gists/' + this.cfg.gistId, { method: 'PATCH', body: { files: files } });
    },

    // Pull remote data, merge (newest record wins), push back if we have anything newer.
    run: async function () {
      if (!this.enabled()) return;
      if (this.running) { this.rerun = true; return; }
      clearTimeout(this.timer); this.timer = null; this.pendingSince = 0;
      this.running = true;
      this.setStatus('syncing');
      try {
        var remote = null;
        if (this.cfg.gistId) {
          try { remote = await this.readRemote(); }
          catch (e) { if (e.status === 404) this.cfg.gistId = null; else throw e; }
        }
        if (!this.cfg.gistId) {
          this.cfg.gistId = await this.findGist();
          if (this.cfg.gistId) remote = await this.readRemote();
        }
        if (!this.cfg.gistId) {
          var g = await this.push(true);
          this.cfg.gistId = g.id;
        } else {
          var pushNeeded = true;
          if (remote) {
            var pulled = mergeInto(state, remote);
            pushNeeded = mergeInto(remote, state) > 0;
            if (pulled) { persist(); onRemoteChanges(pulled); }
          }
          if (pushNeeded) await this.push(false);
        }
        this.cfg.lastSync = now();
        this.saveCfg();
        this.setStatus('ok');
      } catch (e) {
        console.error(e);
        this.saveCfg();
        this.setStatus('error', e.message || String(e));
      } finally {
        this.running = false;
        if (this.rerun) { this.rerun = false; this.schedule(500); }
      }
    },

    // Batch rapid changes together, but never wait more than ~20s.
    schedule: function (delay) {
      if (!this.enabled()) return;
      if (!this.pendingSince) this.pendingSince = now();
      clearTimeout(this.timer);
      var self = this;
      var wait = now() - this.pendingSince > 20000 ? 0 : (delay == null ? 3000 : delay);
      this.timer = setTimeout(function () { self.run(); }, wait);
      if (this.status !== 'syncing') this.setStatus('pending');
    },

    connect: function (token) {
      var self = this;
      this.cfg = { token: token.trim() };
      this.saveCfg();
      return this.run().then(function () {
        if (self.status === 'error' && !self.cfg.lastSync) {
          var err = self.error;
          self.cfg = {};
          self.saveCfg();
          self.setStatus('off', err); // show the setup form again, with the error
        }
      });
    },

    disconnect: function () {
      clearTimeout(this.timer);
      this.cfg = {};
      this.saveCfg();
      this.setStatus('off');
    }
  };

  function onRemoteChanges(n) {
    if (view === 'study') return; // don't disturb an active card
    render();
    toast('Updated with ' + plural(n, 'change') + ' from your other devices.');
  }

  // ------------------------------------------------------------------ rendering
  var app = $('#app');
  var view = 'home';

  function parseRoute() {
    var parts = location.hash.replace(/^#\/?/, '').split('/');
    return { view: parts[0] || 'home', arg: parts[1] ? decodeURIComponent(parts[1]) : null };
  }

  function render() {
    var r = parseRoute();
    view = r.view;
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var active = a.getAttribute('data-nav') === view || (view === 'study' && a.getAttribute('data-nav') === 'home');
      a.classList.toggle('active', active);
    });
    if (view === 'study') renderStudy();
    else if (view === 'cards') renderCards(r.arg);
    else if (view === 'settings') renderSettings();
    else { view = 'home'; renderHome(); }
    renderSyncPill();
  }

  function renderSyncPill() {
    var el = $('#sync-pill');
    if (!el) return;
    var map = {
      off: ['This computer only', 'Progress is saved in this browser. Click to set up sync.'],
      pending: ['Unsynced changes', 'Changes will sync in a moment.'],
      syncing: ['Syncing…', 'Syncing with GitHub…'],
      ok: ['Synced', 'Last synced ' + fmtAgo(Sync.cfg.lastSync)],
      error: ['Sync error', Sync.error]
    };
    var s = Sync.enabled() ? Sync.status : 'off';
    if (s === 'off' && Sync.enabled()) s = 'pending';
    el.className = 'sync-pill ' + s;
    el.textContent = map[s][0];
    el.title = map[s][1];
  }

  // ---- home
  function renderHome() {
    var decks = liveDecks();
    var all = deckStats();
    var resume = session && session.queue.length
      ? '<div class="resume"><strong>Session in progress</strong><span class="muted">' + plural(session.queue.length, 'card') + ' left</span><span class="spacer"></span>' +
        '<a class="btn primary sm" href="#/study">Resume</a><button class="btn sm ghost" data-act="end-session">Discard</button></div>'
      : '';

    var tiles = decks.map(function (d) {
      var s = deckStats(d.id);
      var mPct = s.total ? (s.mastered / s.total) * 100 : 0;
      var lPct = s.total ? (s.learning / s.total) * 100 : 0;
      return '<article class="deck">' +
        '<h3>' + esc(d.name) + '</h3>' +
        (d.description ? '<p class="muted">' + esc(d.description) + '</p>' : '') +
        '<div class="badges">' +
          (s.due ? '<span class="badge due">' + s.due + ' due</span>' : '') +
          (s.fresh ? '<span class="badge new">' + s.fresh + ' new</span>' : '') +
          '<span class="badge mastered">' + s.mastered + ' / ' + s.total + ' mastered</span>' +
        '</div>' +
        '<div class="bar" title="' + s.mastered + ' mastered, ' + s.learning + ' learning, ' + s.fresh + ' new">' +
          '<div class="b-mastered" style="width:' + mPct + '%"></div><div class="b-learning" style="width:' + lPct + '%"></div></div>' +
        '<div class="deck-actions">' +
          '<button class="btn primary sm" data-act="study" data-deck="' + esc(d.id) + '"' + (s.due || s.fresh ? '' : ' disabled') + '>Study</button>' +
          '<button class="btn sm" data-act="cram" data-deck="' + esc(d.id) + '"' + (s.total ? '' : ' disabled') + ' title="Go through every card in this deck without affecting your schedule">Practice all</button>' +
          '<a class="btn sm ghost" href="#/cards/' + encodeURIComponent(d.id) + '">Edit cards</a>' +
        '</div>' +
      '</article>';
    }).join('');

    var studyable = all.due + Math.min(all.fresh, state.prefs.newPerSession);
    app.innerHTML =
      resume +
      '<div class="stats">' +
        '<div class="stat due"><div class="num">' + all.due + '</div><div class="lbl">Due for review</div></div>' +
        '<div class="stat new"><div class="num">' + all.fresh + '</div><div class="lbl">New cards</div></div>' +
        '<div class="stat mastered"><div class="num">' + all.mastered + '</div><div class="lbl">Mastered</div></div>' +
        '<div class="stat"><div class="num">' + streak() + '🔥</div><div class="lbl">Day streak</div></div>' +
      '</div>' +
      '<div class="hero-actions">' +
        '<button class="btn primary big" data-act="study-all"' + (studyable ? '' : ' disabled') + '>' +
          (all.due ? 'Review ' + plural(all.due, 'due card') : 'Study all decks') + '</button>' +
      '</div>' +
      '<div class="section-head"><h2>Decks</h2><span class="spacer"></span><button class="btn sm" data-act="new-deck">+ New deck</button></div>' +
      (decks.length ? '<div class="deck-grid">' + tiles + '</div>'
        : '<div class="panel empty">You have no decks. <button class="btn primary sm" data-act="new-deck">Create one</button> or restore the defaults in Settings.</div>');
  }

  // ---- study
  function termSize(text) {
    var n = Array.from(text || '').length;
    return n <= 2 ? 'xl' : n <= 7 ? 'lg' : 'md';
  }

  function renderStudy() {
    if (!session) { location.hash = '#/'; return; }
    var card = currentCard();
    if (!card) { renderDone(); return; }
    if (card.deleted) { session.queue.shift(); renderStudy(); return; }

    if (!session.dir) {
      var d = state.prefs.direction;
      session.dir = d === 'mixed' ? (Math.random() < 0.5 ? 'jp-en' : 'en-jp') : d;
    }
    var jpFirst = session.dir === 'jp-en';
    var deck = state.decks[card.deckId];
    var remaining = session.queue.length;
    var pct = (session.done / (session.done + remaining)) * 100;
    var speakBtn = '<button class="btn sm ghost speak" data-act="speak" title="Listen (P)" aria-label="Listen">🔊</button>';
    var deckTag = '<span class="deck-tag">' + esc(deck ? deck.name : '') + '</span>';

    var front = jpFirst
      ? deckTag + speakBtn +
        '<div class="term ' + termSize(card.front) + '">' + esc(card.front) + '</div>' +
        (state.prefs.readingOnFront && card.reading ? '<div class="reading">' + esc(card.reading) + '</div>' : '') +
        '<div class="hint">What does this mean? · tap to flip</div>'
      : deckTag +
        '<div class="term en md">' + esc(card.back) + '</div>' +
        '<div class="hint">How do you say this in Japanese? · tap to flip</div>';

    var back = deckTag + speakBtn +
      '<div class="term ' + termSize(card.front) + '">' + esc(card.front) + '</div>' +
      (card.reading ? '<div class="reading">' + esc(card.reading) + '</div>' : '') +
      '<div class="divider"></div>' +
      '<div class="meaning">' + esc(card.back) + '</div>' +
      (card.notes ? '<div class="notes">' + esc(card.notes) + '</div>' : '');

    app.innerHTML =
      '<div class="study">' +
        '<div class="study-top">' +
          '<button class="btn sm ghost" data-act="end-session">← End</button>' +
          '<span>' + (session.mode === 'cram' ? 'Practice (doesn\'t change your schedule)' : 'Study') + '</span>' +
          '<span class="spacer"></span>' +
          '<span>' + plural(remaining, 'card') + ' left</span>' +
        '</div>' +
        '<div class="progress"><div style="width:' + pct + '%"></div></div>' +
        '<div class="flashcard' + (session.flipped ? ' flipped' : '') + '" id="flashcard" tabindex="0" role="button" aria-label="Flashcard, press space to flip" data-act="flip">' +
          '<div class="flashcard-inner"><div class="face front">' + front + '</div><div class="face back">' + back + '</div></div>' +
        '</div>' +
        '<div class="actions" id="study-actions"></div>' +
      '</div>';
    renderStudyActions();
    if (state.prefs.autoSpeak && jpFirst && !session.flipped) speak(card);
  }

  function renderStudyActions() {
    var el = $('#study-actions');
    if (!el || !session) return;
    var card = currentCard();
    if (!session.flipped) {
      el.innerHTML = '<button class="btn primary big flip-btn" data-act="flip">Show answer <kbd>Space</kbd></button>';
      return;
    }
    if (session.mode === 'cram') {
      el.innerHTML = '<div class="rate two">' +
        '<button class="btn r1" data-act="rate" data-r="1">Again<small>show it again <kbd>1</kbd></small></button>' +
        '<button class="btn r3" data-act="rate" data-r="3">Got it<small>next card <kbd>Space</kbd></small></button>' +
      '</div>';
      return;
    }
    var labels = ['Again', 'Hard', 'Good', 'Easy'];
    el.innerHTML = '<div class="rate">' + labels.map(function (l, i) {
      var r = i + 1;
      return '<button class="btn r' + r + '" data-act="rate" data-r="' + r + '">' + l +
        '<small>' + previewInterval(card.id, r) + ' <kbd>' + r + '</kbd></small></button>';
    }).join('') + '</div>';
  }

  function renderDone() {
    var moreNew = session.mode === 'review' && liveCards().some(function (c) {
      return session.deckIds.indexOf(c.deckId) !== -1 && !isSeen(c.id);
    });
    app.innerHTML =
      '<div class="study"><div class="panel done">' +
        '<div class="big-emoji">🎉</div>' +
        '<h2>お疲れ様でした！ <span class="muted small">(Great work!)</span></h2>' +
        '<p class="muted">You finished ' + plural(session.done, 'card') +
          (session.again ? ' and went back to ' + plural(session.again, 'card') + ' you missed' : '') + '.</p>' +
        '<div class="row">' +
          '<button class="btn primary" data-act="finish">Back to decks</button>' +
          (moreNew ? '<button class="btn" data-act="more-new">Learn ' + state.prefs.newPerSession + ' more new cards</button>' : '') +
          '<button class="btn" data-act="cram-again">Practice these decks</button>' +
        '</div>' +
      '</div></div>';
  }

  // ---- cards manager
  var cardsDeckId = null;
  var cardsQuery = '';

  function renderCards(deckArg) {
    var decks = liveDecks();
    if (deckArg === 'all') cardsDeckId = 'all';
    else if (deckArg && isLiveDeck(deckArg)) cardsDeckId = deckArg;
    if (!cardsDeckId || (cardsDeckId !== 'all' && !isLiveDeck(cardsDeckId))) cardsDeckId = decks.length ? decks[0].id : 'all';

    var options = '<option value="all"' + (cardsDeckId === 'all' ? ' selected' : '') + '>All decks</option>' +
      decks.map(function (d) {
        return '<option value="' + esc(d.id) + '"' + (d.id === cardsDeckId ? ' selected' : '') + '>' + esc(d.name) + ' (' + liveCards(d.id).length + ')</option>';
      }).join('');
    var oneDeck = cardsDeckId !== 'all';

    app.innerHTML =
      '<div class="section-head"><h2>Your cards</h2><span class="muted small">Add, edit or delete cards here. Changes save automatically.</span></div>' +
      '<div class="toolbar">' +
        '<select id="deck-select" aria-label="Deck">' + options + '</select>' +
        '<button class="btn sm" data-act="new-deck">+ New deck</button>' +
        (oneDeck ? '<button class="btn sm" data-act="edit-deck">Rename deck</button><button class="btn sm danger" data-act="delete-deck">Delete deck</button>' : '') +
      '</div>' +
      '<div class="toolbar">' +
        '<input type="search" id="card-search" placeholder="Search Japanese, reading or meaning…" value="' + esc(cardsQuery) + '">' +
        '<button class="btn primary" data-act="add-card"' + (decks.length ? '' : ' disabled') + '>+ Add card</button>' +
        '<button class="btn" data-act="bulk-add"' + (decks.length ? '' : ' disabled') + '>Bulk add</button>' +
      '</div>' +
      '<p class="muted small" id="card-count"></p>' +
      '<div id="card-list"></div>';

    $('#deck-select').addEventListener('change', function (e) { location.hash = '#/cards/' + encodeURIComponent(e.target.value); });
    $('#card-search').addEventListener('input', function (e) { cardsQuery = e.target.value; renderCardList(); });
    renderCardList();
  }

  function renderCardList() {
    var list = $('#card-list');
    if (!list) return;
    var q = cardsQuery.trim().toLowerCase();
    var cards = liveCards(cardsDeckId === 'all' ? null : cardsDeckId).filter(function (c) {
      return !q || [c.front, c.reading, c.back, c.notes].join(' ').toLowerCase().indexOf(q) !== -1;
    });
    $('#card-count').textContent = plural(cards.length, 'card') + (q ? ' match your search' : '');
    if (!cards.length) {
      list.innerHTML = '<div class="card-list empty">' + (q ? 'No cards match your search.' : 'No cards here yet. Click <strong>+ Add card</strong> to make one.') + '</div>';
      return;
    }
    var labels = { 'new': 'new', due: 'due', learning: 'learning', mastered: 'mastered' };
    var t = now();
    list.innerHTML = '<div class="card-list">' + cards.map(function (c) {
      var st = cardStatus(c.id, t);
      return '<div class="card-row" data-act="edit-card" data-id="' + esc(c.id) + '" title="Click to edit">' +
        '<div class="c-jp">' + esc(c.front) + '</div>' +
        '<div class="c-reading">' + esc(c.reading) + '</div>' +
        '<div class="c-back">' + esc(c.back) + '</div>' +
        '<div class="c-status"><span class="badge ' + (st === 'new' ? 'new' : st) + '">' + labels[st] + '</span></div>' +
      '</div>';
    }).join('') + '</div>';
  }

  // ---- settings
  function renderSettings() {
    var p = state.prefs;
    app.innerHTML =
      '<section class="panel"><h2>Study preferences</h2>' +
        '<div class="settings-grid">' +
          '<label class="field"><span>New cards per session</span><input type="number" min="1" max="200" id="pref-new" value="' + p.newPerSession + '">' +
            '<small>How many never-seen cards to introduce each time you study.</small></label>' +
          '<label class="field"><span>Card direction</span><select id="pref-dir">' +
            '<option value="jp-en"' + (p.direction === 'jp-en' ? ' selected' : '') + '>Japanese → English</option>' +
            '<option value="en-jp"' + (p.direction === 'en-jp' ? ' selected' : '') + '>English → Japanese</option>' +
            '<option value="mixed"' + (p.direction === 'mixed' ? ' selected' : '') + '>Mixed (random)</option>' +
          '</select><small>Which side of the card you see first.</small></label>' +
        '</div>' +
        '<label class="check"><input type="checkbox" id="pref-reading"' + (p.readingOnFront ? ' checked' : '') + '> Show the reading (kana / romaji) on the front of the card</label>' +
        '<label class="check"><input type="checkbox" id="pref-speak"' + (p.autoSpeak ? ' checked' : '') + '> Read Japanese aloud automatically</label>' +
      '</section>' +
      '<section class="panel" id="sync-section"></section>' +
      '<section class="panel"><h2>Backup</h2>' +
        '<p class="muted">Download all your cards and progress as a file, or load a backup file. Importing merges with what you have (the newest version of each card wins).</p>' +
        '<div class="row"><button class="btn" data-act="export">Download backup</button>' +
        '<button class="btn" data-act="import">Import backup…</button><input type="file" id="import-file" accept=".json,application/json" hidden></div>' +
      '</section>' +
      '<section class="panel"><h2>Reset</h2>' +
        '<div class="row">' +
          '<button class="btn" data-act="restore-defaults" title="Bring back any built-in cards or decks you deleted">Restore deleted starter cards</button>' +
          '<button class="btn danger" data-act="reset-progress">Reset all progress</button>' +
        '</div>' +
      '</section>';

    function savePrefs(changes) {
      state.prefs = assign({}, state.prefs, changes, { updatedAt: now() });
      commit();
      toast('Preferences saved');
    }
    $('#pref-new').addEventListener('change', function (e) {
      var v = Math.max(1, Math.min(200, parseInt(e.target.value, 10) || DEFAULT_PREFS.newPerSession));
      e.target.value = v;
      savePrefs({ newPerSession: v });
    });
    $('#pref-dir').addEventListener('change', function (e) { savePrefs({ direction: e.target.value }); });
    $('#pref-reading').addEventListener('change', function (e) { savePrefs({ readingOnFront: e.target.checked }); });
    $('#pref-speak').addEventListener('change', function (e) { savePrefs({ autoSpeak: e.target.checked }); });
    $('#import-file').addEventListener('change', importFile);
    renderSyncSection();
  }

  function renderSyncSection() {
    var el = $('#sync-section');
    if (!el) return;
    if (!Sync.enabled()) {
      el.innerHTML =
        '<h2>Sync across computers</h2>' +
        '<p class="muted">Right now your progress is saved only in this browser. To use it on other computers, connect a free GitHub account. ' +
        'Your data is stored in a private (secret) GitHub Gist that only you can edit.</p>' +
        '<ol class="steps">' +
          '<li>Sign in to GitHub, then <a href="https://github.com/settings/tokens/new?scopes=gist&description=Japanese%20Flashcards" target="_blank" rel="noopener">create a token with the “gist” permission</a> ' +
            '(that link pre-fills it — just choose an expiration and click <em>Generate token</em>).</li>' +
          '<li>Copy the token (it starts with <code>ghp_</code>) and paste it below.</li>' +
          '<li>Do the same on each computer you use — paste the same token (or make another one). Everything stays in sync automatically.</li>' +
        '</ol>' +
        '<form id="sync-form" class="row">' +
          '<input type="password" id="sync-token" placeholder="Paste your GitHub token" autocomplete="off" style="flex:1 1 260px;width:auto" required>' +
          '<button class="btn primary" type="submit">Connect</button>' +
        '</form>' +
        (Sync.error ? '<p class="status-line error" style="margin-top:12px">' + esc(Sync.error) + '</p>' : '');
      $('#sync-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var tok = $('#sync-token').value.trim();
        if (!tok) return;
        Sync.connect(tok).then(function () {
          if (Sync.status === 'ok') toast('Sync is on! ✓');
        });
      });
      return;
    }
    var line;
    if (Sync.status === 'error') line = '<p class="status-line error">⚠ ' + esc(Sync.error) + '</p>';
    else if (Sync.status === 'syncing') line = '<p class="status-line">Syncing…</p>';
    else if (Sync.status === 'pending') line = '<p class="status-line">Waiting to sync your latest changes…</p>';
    else line = '<p class="status-line ok">✓ Sync is on. Last synced ' + esc(fmtAgo(Sync.cfg.lastSync)) + '.</p>';
    el.innerHTML =
      '<h2>Sync across computers</h2>' + line +
      '<p class="muted small">Changes sync automatically a few seconds after you make them, and when you come back to this tab. ' +
      'On another computer, open this app, go to Settings and paste a GitHub token from the same account.' +
      (Sync.cfg.gistId ? ' Data is stored in <a href="https://gist.github.com/' + encodeURIComponent(Sync.cfg.gistId) + '" target="_blank" rel="noopener">your private gist</a>.' : '') + '</p>' +
      '<div class="row"><button class="btn primary" data-act="sync-now"' + (Sync.status === 'syncing' ? ' disabled' : '') + '>Sync now</button>' +
      '<button class="btn danger" data-act="sync-disconnect">Disconnect this computer</button></div>';
  }

  // ------------------------------------------------------------------ modals
  var modalCleanup = null;

  function openModal(opts) {
    closeModal();
    var root = $('#modal-root');
    root.innerHTML =
      '<div class="modal-backdrop"><form class="modal" novalidate>' +
        '<h2>' + esc(opts.title) + '</h2>' +
        '<div class="modal-body">' + opts.body + '</div>' +
        '<div class="modal-actions">' + (opts.extra || '') + '<span class="spacer"></span>' +
          '<button type="button" class="btn" data-modal-close>Cancel</button>' +
          '<button type="submit" class="btn primary">' + esc(opts.submit || 'Save') + '</button>' +
        '</div>' +
      '</form></div>';
    var backdrop = root.firstChild, form = backdrop.firstChild;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (opts.onSubmit(form) !== false) closeModal();
    });
    backdrop.addEventListener('mousedown', function (e) { if (e.target === backdrop) closeModal(); });
    form.querySelector('[data-modal-close]').addEventListener('click', closeModal);
    if (opts.onOpen) opts.onOpen(form);
    var first = form.querySelector('input:not([type=hidden]), textarea, select');
    if (first) first.focus();
    function onKey(e) { if (e.key === 'Escape') closeModal(); }
    document.addEventListener('keydown', onKey);
    modalCleanup = function () { document.removeEventListener('keydown', onKey); };
  }

  function closeModal() {
    if (modalCleanup) { modalCleanup(); modalCleanup = null; }
    $('#modal-root').innerHTML = '';
  }

  function modalOpen() { return !!$('#modal-root').firstChild; }

  function deckOptions(selected) {
    return liveDecks().map(function (d) {
      return '<option value="' + esc(d.id) + '"' + (d.id === selected ? ' selected' : '') + '>' + esc(d.name) + '</option>';
    }).join('');
  }

  function defaultDeckForNewCard() {
    if (cardsDeckId && cardsDeckId !== 'all' && isLiveDeck(cardsDeckId)) return cardsDeckId;
    var d = liveDecks()[0];
    return d && d.id;
  }

  function openCardEditor(cardId) {
    var c = cardId ? state.cards[cardId] : null;
    var p = c && state.progress[c.id];
    var info = '';
    if (c) {
      var st = cardStatus(c.id);
      info = '<p class="muted small">Status: <strong>' + st + '</strong>' +
        (p && p.lastReviewed ? ' · next review ' + (p.due <= now() ? 'now' : 'in ' + fmtDuration(p.due - now())) : '') + '</p>';
    }
    openModal({
      title: c ? 'Edit card' : 'Add a card',
      submit: c ? 'Save' : 'Add card',
      body:
        '<label class="field"><span>Deck</span><select name="deckId">' + deckOptions(c ? c.deckId : defaultDeckForNewCard()) + '</select></label>' +
        '<label class="field"><span>Japanese (front)</span><input type="text" name="front" class="jp" required value="' + esc(c ? c.front : '') + '" placeholder="e.g. 猫"></label>' +
        '<label class="field"><span>Reading <span class="muted">(optional)</span></span><input type="text" name="reading" class="jp" value="' + esc(c ? c.reading : '') + '" placeholder="e.g. ねこ · neko"></label>' +
        '<label class="field"><span>Meaning (back)</span><input type="text" name="back" required value="' + esc(c ? c.back : '') + '" placeholder="e.g. cat"></label>' +
        '<label class="field"><span>Notes <span class="muted">(optional)</span></span><textarea name="notes" rows="2" placeholder="Example sentence, memory trick…">' + esc(c ? c.notes : '') + '</textarea></label>' +
        info,
      extra: c
        ? '<button type="button" class="btn danger" data-act="modal-delete-card">Delete</button>' +
          (p && p.lastReviewed ? '<button type="button" class="btn" data-act="modal-reset-card">Reset progress</button>' : '')
        : '<label class="check small" style="margin:0"><input type="checkbox" name="another" checked> Add another after this</label>',
      onOpen: function (form) {
        var del = form.querySelector('[data-act="modal-delete-card"]');
        if (del) del.addEventListener('click', function () {
          if (!confirm('Delete this card? This cannot be undone.')) return;
          state.cards[c.id] = assign({}, c, { deleted: true, updatedAt: now() });
          commit(); closeModal(); render(); toast('Card deleted');
        });
        var reset = form.querySelector('[data-act="modal-reset-card"]');
        if (reset) reset.addEventListener('click', function () {
          state.progress[c.id] = { updatedAt: now() };
          commit(); closeModal(); render(); toast('Progress reset — this card is new again');
        });
      },
      onSubmit: function (form) {
        var f = form.elements;
        var data = {
          deckId: f.deckId.value,
          front: f.front.value.trim(),
          reading: f.reading.value.trim(),
          back: f.back.value.trim(),
          notes: f.notes.value.trim()
        };
        if (!data.front || !data.back) { toast('Please fill in both the Japanese and the meaning.'); return false; }
        if (c) {
          state.cards[c.id] = assign({}, c, data, { updatedAt: now() });
          commit(); render(); toast('Card saved');
          return true;
        }
        var id = uid('c-');
        state.cards[id] = assign({ id: id, order: now() }, data, { updatedAt: now() });
        commit(); render(); toast('Card added');
        if (f.another && f.another.checked) {
          cardsDeckId = data.deckId;
          setTimeout(function () { openCardEditor(null); }, 0);
        }
        return true;
      }
    });
  }

  function openBulkAdd() {
    openModal({
      title: 'Bulk add cards',
      submit: 'Add cards',
      body:
        '<label class="field"><span>Deck</span><select name="deckId">' + deckOptions(defaultDeckForNewCard()) + '</select></label>' +
        '<label class="field"><span>Cards — one per line</span>' +
          '<textarea name="lines" rows="9" class="jp" placeholder="猫 | ねこ · neko | cat\n犬 | いぬ · inu | dog\nありがとう | thank you"></textarea>' +
          '<small>Separate the parts with <code>|</code> (or paste two to four columns from a spreadsheet).<br>' +
          '2 parts = Japanese | meaning · 3 parts = Japanese | reading | meaning · 4 parts = … | notes</small></label>',
      onSubmit: function (form) {
        var deckId = form.elements.deckId.value;
        var lines = form.elements.lines.value.split(/\r?\n/);
        var added = 0, skipped = 0, t = now();
        lines.forEach(function (line, i) {
          if (!line.trim()) return;
          var parts = line.split(line.indexOf('|') !== -1 ? '|' : '\t').map(function (s) { return s.trim(); });
          var card;
          if (parts.length === 2) card = { front: parts[0], reading: '', back: parts[1], notes: '' };
          else if (parts.length >= 3) card = { front: parts[0], reading: parts[1], back: parts[2], notes: parts.slice(3).join(' | ') };
          if (!card || !card.front || !card.back) { skipped++; return; }
          var id = uid('c-');
          state.cards[id] = assign({ id: id, deckId: deckId, order: t + i, updatedAt: t }, card);
          added++;
        });
        if (!added) { toast(skipped ? 'Couldn\'t read those lines — use "Japanese | meaning".' : 'Nothing to add.'); return false; }
        commit(); render();
        toast('Added ' + plural(added, 'card') + (skipped ? ' (skipped ' + skipped + ' unreadable line' + (skipped === 1 ? '' : 's') + ')' : ''));
        return true;
      }
    });
  }

  function openDeckEditor(deckId) {
    var d = deckId ? state.decks[deckId] : null;
    openModal({
      title: d ? 'Rename deck' : 'New deck',
      submit: d ? 'Save' : 'Create deck',
      body:
        '<label class="field"><span>Name</span><input type="text" name="name" required value="' + esc(d ? d.name : '') + '" placeholder="e.g. Animals"></label>' +
        '<label class="field"><span>Description <span class="muted">(optional)</span></span><input type="text" name="description" value="' + esc(d ? d.description : '') + '"></label>',
      onSubmit: function (form) {
        var name = form.elements.name.value.trim();
        var description = form.elements.description.value.trim();
        if (!name) { toast('Please give the deck a name.'); return false; }
        if (d) {
          state.decks[d.id] = assign({}, d, { name: name, description: description, updatedAt: now() });
          commit(); render(); toast('Deck saved');
        } else {
          var id = uid('d-');
          state.decks[id] = { id: id, name: name, description: description, order: now(), updatedAt: now() };
          commit();
          cardsDeckId = id;
          location.hash = '#/cards/' + encodeURIComponent(id);
          render();
          toast('Deck created — now add some cards!');
        }
        return true;
      }
    });
  }

  // ------------------------------------------------------------------ backup
  function exportData() {
    var blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'japanese-flashcards-backup-' + dayKey() + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function importFile(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object' || !data.cards) throw new Error('not a backup');
        var n = mergeInto(state, data);
        commit(); render();
        toast(n ? 'Imported ' + plural(n, 'change') : 'Nothing new in that backup');
      } catch (err) {
        toast('That file is not a flashcard backup.');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  // ------------------------------------------------------------------ actions
  var actions = {
    'flip': flip,
    'rate': function (el) { rate(parseInt(el.getAttribute('data-r'), 10)); },
    'speak': function (el, e) { e.stopPropagation(); speak(currentCard()); },
    'study-all': function () { startSession(liveDecks().map(function (d) { return d.id; }), 'review'); },
    'study': function (el) { startSession([el.getAttribute('data-deck')], 'review'); },
    'cram': function (el) { startSession([el.getAttribute('data-deck')], 'cram'); },
    'end-session': function () { session = null; location.hash = '#/'; render(); },
    'finish': function () { session = null; location.hash = '#/'; },
    'more-new': function () { startSession(session.deckIds, 'review'); },
    'cram-again': function () { startSession(session.deckIds, 'cram'); },
    'new-deck': function () { openDeckEditor(null); },
    'edit-deck': function () { openDeckEditor(cardsDeckId); },
    'delete-deck': function () {
      var d = state.decks[cardsDeckId];
      if (!d) return;
      var n = liveCards(d.id).length;
      if (!confirm('Delete the deck "' + d.name + '" and its ' + plural(n, 'card') + '? This cannot be undone.')) return;
      var t = now();
      state.decks[d.id] = assign({}, d, { deleted: true, updatedAt: t });
      liveCards(d.id).forEach(function (c) { state.cards[c.id] = assign({}, c, { deleted: true, updatedAt: t }); });
      cardsDeckId = null;
      commit(); location.hash = '#/cards'; render(); toast('Deck deleted');
    },
    'add-card': function () { openCardEditor(null); },
    'bulk-add': openBulkAdd,
    'edit-card': function (el) { openCardEditor(el.getAttribute('data-id')); },
    'goto-sync': function () {
      location.hash = '#/settings';
      setTimeout(function () { var s = $('#sync-section'); if (s) s.scrollIntoView({ behavior: 'smooth' }); }, 50);
    },
    'sync-now': function () { Sync.run(); },
    'sync-disconnect': function () {
      if (!confirm('Stop syncing on this computer? Your cards stay here, and your synced data stays safe on GitHub.')) return;
      Sync.disconnect(); toast('Sync turned off on this computer');
    },
    'export': exportData,
    'import': function () { $('#import-file').click(); },
    'reset-progress': function () {
      if (!confirm('Reset ALL study progress? Every card will become new again. Your cards are kept.')) return;
      if (!confirm('Are you sure? This cannot be undone.')) return;
      var t = now();
      Object.keys(state.progress).forEach(function (id) { state.progress[id] = { updatedAt: t }; });
      session = null;
      commit(); render(); toast('Progress reset');
    },
    'restore-defaults': function () {
      var seed = seedState(), t = now(), n = 0;
      Object.keys(seed.decks).forEach(function (id) {
        if (state.decks[id] && state.decks[id].deleted) { state.decks[id] = assign({}, seed.decks[id], { updatedAt: t }); n++; }
      });
      Object.keys(seed.cards).forEach(function (id) {
        if (state.cards[id] && state.cards[id].deleted) { state.cards[id] = assign({}, seed.cards[id], { updatedAt: t }); n++; }
      });
      commit(); render();
      toast(n ? 'Restored ' + plural(n, 'item') : 'Nothing to restore — all starter cards are present');
    }
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var fn = actions[el.getAttribute('data-act')];
    if (fn) fn(el, e);
  });

  document.addEventListener('keydown', function (e) {
    if (view !== 'study' || !session || modalOpen()) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    var k = e.key;
    if (k === 'p' || k === 'P') { speak(currentCard()); return; }
    if (!session.flipped) {
      if (k === ' ' || k === 'Enter') { e.preventDefault(); flip(); }
      return;
    }
    if (k === ' ' || k === 'Enter') { e.preventDefault(); rate(3); return; }
    if (/^[1-4]$/.test(k)) {
      var r = parseInt(k, 10);
      if (session.mode === 'cram' && r > 1) r = 3;
      rate(r);
    }
  });

  window.addEventListener('hashchange', function () { closeModal(); render(); });

  // Keep in sync when switching between tabs/computers.
  document.addEventListener('visibilitychange', function () {
    if (!Sync.enabled()) return;
    if (document.visibilityState === 'visible' || Sync.timer) Sync.run();
  });
  window.addEventListener('online', function () { Sync.run(); });
  setInterval(function () {
    if (Sync.enabled() && document.visibilityState === 'visible') Sync.run();
    else renderSyncPill();
  }, 5 * 60000);

  // Another tab on this same computer saved data → reload it.
  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try { if (mergeInto(state, JSON.parse(e.newValue)) && view !== 'study') render(); } catch (err) { /* ignore */ }
  });

  // Warm up the voice list (some browsers load it lazily).
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();

  // Expose a tiny API for debugging/tests.
  window.JPFlashcards = { state: function () { return state; }, Sync: Sync, mergeInto: mergeInto, schedule: schedule };

  persist();
  render();
  if (Sync.enabled()) Sync.run();
})();
