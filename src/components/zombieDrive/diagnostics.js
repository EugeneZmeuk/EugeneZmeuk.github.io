// Logs and crash reports for Zombie Drive. The site is static, so nothing leaves the
// browser by itself: events stay in localStorage and the player chooses to share a report.

const STORE = 'zombie-drive-diag';
const MAX_EVENTS = 400;
const MAX_SESSIONS = 5;
const FREEZE_MS = 1500;
const PERF_EVERY_S = 20;
const ISSUES = 'https://github.com/EugeneZmeuk/EugeneZmeuk.github.io/issues/new';

const readStore = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORE)) || [];
  } catch (e) {
    return [];
  }
};

const describeError = (e) => {
  if (e instanceof Error) return {message: `${e.name}: ${e.message}`, stack: (e.stack || '').slice(0, 1500)};
  return {message: String(e).slice(0, 500)};
};

export class Diagnostics {
  constructor() {
    this.previous = readStore();
    this.session = {
      id: Date.now().toString(36),
      started: new Date().toISOString(),
      url: window.location.href.split('?')[0],
      system: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}@${window.devicePixelRatio}`,
        cores: navigator.hardwareConcurrency,
        memoryGB: navigator.deviceMemory,
      },
      events: [],
      counts: {},
      crashed: false,
    };
    this.t0 = performance.now();
    this.seen = new Set();
    this.perf = null;
    this.onFatal = null;
  }

  now() {
    return Math.round((performance.now() - this.t0) / 100) / 10;
  }

  log(type, data) {
    const s = this.session;
    s.counts[type] = (s.counts[type] || 0) + 1;
    s.events.push({t: this.now(), type, ...data});
    if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
  }

  /** Record an error. A repeat of the same one only bumps a counter, so a bad frame loop cannot flood the log. */
  error(kind, e, extra) {
    const d = describeError(e);
    const key = `${kind}|${d.message}|${(d.stack || '').split('\n')[1] || ''}`;
    if (this.seen.has(key)) {
      this.session.counts.repeats = (this.session.counts.repeats || 0) + 1;
      return;
    }
    this.seen.add(key);
    this.log(kind, {...d, ...extra});
    this.save();
  }

  /** Something the game cannot carry on from. */
  crash(where, e, extra) {
    this.session.crashed = true;
    this.error('crash', e, {where, ...extra});
  }

  attach(renderer) {
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    this.session.system.gpu = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unknown';
    this.session.system.webgl = gl.getParameter(gl.VERSION);
    this.onError = (ev) => this.error('error', ev.error || ev.message, {source: `${ev.filename || ''}:${ev.lineno || 0}`});
    this.onRejection = (ev) => this.error('rejection', ev.reason);
    this.onHide = () => {
      this.log('leave', {});
      this.save();
    };
    this.onVisible = () => {
      this.skipFrame = true;
      this.perf = null;
      this.log('visibility', {hidden: document.hidden});
    };
    this.onContextLost = (ev) => {
      ev.preventDefault();
      this.crash('webgl', 'WebGL context lost');
      if (this.onFatal) this.onFatal('The browser dropped the graphics context.');
    };
    this.canvas = renderer.domElement;
    window.addEventListener('error', this.onError);
    window.addEventListener('unhandledrejection', this.onRejection);
    window.addEventListener('pagehide', this.onHide);
    document.addEventListener('visibilitychange', this.onVisible);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.consoleError = console.error;
    console.error = (...args) => {
      this.error('console', args.map((a) => (a instanceof Error ? a.message : String(a))).join(' ').slice(0, 500));
      this.consoleError.apply(console, args);
    };
    this.saver = setInterval(() => this.save(), 30000);
    this.save();
  }

  detach() {
    window.removeEventListener('error', this.onError);
    window.removeEventListener('unhandledrejection', this.onRejection);
    window.removeEventListener('pagehide', this.onHide);
    document.removeEventListener('visibilitychange', this.onVisible);
    if (this.canvas) this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    if (this.consoleError) console.error = this.consoleError;
    clearInterval(this.saver);
    this.save();
  }

  /** Called every frame while the game runs. */
  frame(ms, playing) {
    if (this.skipFrame) {
      this.skipFrame = false;
      return;
    }
    if (ms > FREEZE_MS && !document.hidden) this.log('freeze', {ms: Math.round(ms)});
    // measure only full windows of real play: menus and pauses would read as a slowdown
    if (!playing) {
      this.perf = null;
      return;
    }
    if (!this.perf) {
      this.perf = {frames: 0, worst: 0, since: performance.now()};
      return;
    }
    const p = this.perf;
    p.frames += 1;
    p.worst = Math.max(p.worst, ms);
    const span = (performance.now() - p.since) / 1000;
    if (span >= PERF_EVERY_S) {
      this.log('perf', {fps: Math.round(p.frames / span), worstMs: Math.round(p.worst)});
      this.perf = null;
    }
  }

  save() {
    try {
      const sessions = [...this.previous.filter((s) => s.id !== this.session.id), this.session].slice(-MAX_SESSIONS);
      window.localStorage.setItem(STORE, JSON.stringify(sessions));
    } catch (e) {
      /* storage may be full or blocked; the report still works from memory */
    }
  }

  clear() {
    this.previous = [];
    this.session.events = [];
    this.session.counts = {};
    this.seen.clear();
    try {
      window.localStorage.removeItem(STORE);
    } catch (e) {
      /* nothing to clear */
    }
  }

  /** Previous runs that ended badly, for the note on the report panel. */
  problems() {
    const all = [...this.previous, this.session];
    const sum = (key) => all.reduce((n, s) => n + (s.counts[key] || 0), 0);
    return {crashes: sum('crash'), errors: sum('error') + sum('rejection') + sum('console'), stuck: sum('stuck'), freezes: sum('freeze'), sessions: all.length};
  }

  reportText() {
    return JSON.stringify({game: 'Zombie Drive', generated: new Date().toISOString(), sessions: [...this.previous, this.session]}, null, 1);
  }

  download() {
    const url = URL.createObjectURL(new Blob([this.reportText()], {type: 'application/json'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = `zombie-drive-report-${this.session.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /** Prefilled GitHub issue. It opens for the player to read and submit; nothing is sent here. */
  issueUrl() {
    const s = this.session;
    const p = this.problems();
    const worth = (e) => !['perf', 'visibility', 'leave'].includes(e.type);
    const recent = [...this.previous.flatMap((x) => x.events), ...s.events].filter(worth).slice(-25);
    const trimmed = recent.map((e) => {
      const {stack, ...rest} = e;
      return JSON.stringify(stack ? {...rest, stack: stack.split('\n').slice(0, 3).join(' | ')} : rest);
    });
    const body = [
      'What happened:',
      '',
      '',
      `Crashes ${p.crashes}, errors ${p.errors}, stuck ${p.stuck}, freezes ${p.freezes}, sessions ${p.sessions}`,
      `GPU: ${s.system.gpu}`,
      `Browser: ${s.system.userAgent}`,
      '',
      '```',
      ...trimmed,
      '```',
    ].join('\n').slice(0, 5500);
    return `${ISSUES}?title=${encodeURIComponent('Zombie Drive: problem report')}&body=${encodeURIComponent(body)}`;
  }
}
