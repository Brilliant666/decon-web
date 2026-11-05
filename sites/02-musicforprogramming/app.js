/**
 * Specimen #02: musicForProgramming(); — Main Application Controller
 * 1:1 Deconstruction + Web Audio Procedural Ambient Fallback + RAW/PRO Suite
 */

import { MFP_META, MFP_EPISODES } from './episodes.js';
import { MfpUI } from '/shared-ui/mfp-ui.js';

(() => {
  const STORAGE_KEYS = {
    FAVS: 'mfp-decon-favourites',
    VOL: 'mfp-decon-volume',
    THEME: 'mfp-decon-theme',
    PRO: 'mfp-decon-pro',
    COOKIE: 'mfp-decon-cookie-ack'
  };

  const THEMES = [
    { id: 'mfp-dark', label: 'MFP DARK', color: '#1a1a1a' },
    { id: 'gruvbox', label: 'GRUVBOX', color: '#1d2021' },
    { id: 'solarized', label: 'SOLARIZED', color: '#002b36' },
    { id: 'paper-light', label: 'PAPER LIGHT', color: '#d5d5d5' }
  ];

  // State
  let currentEp = MFP_EPISODES[0]; // Default latest (Episode 79: Corticyte)
  let currentView = 'episodes';    // 'episodes' | 'about' | 'credits'
  let playState = 'paused';        // 'playing' | 'paused' | 'stopped'
  let synthMode = false;           // false = MP3 Stream (with auto-fallback), true = Procedural Ambient Synth
  let synthTimeSec = 0;
  let synthClockId = 0;
  let streamFallbackTimer = 0;
  let pendingSeekSec = null;

  let sortDesc = true;
  let filterQuery = '';
  let favourites = loadJson(STORAGE_KEYS.FAVS, []);
  let volume = clamp(Number(localStorage.getItem(STORAGE_KEYS.VOL) || 0.8), 0.05, 1.0);
  let themeIdx = Math.max(0, THEMES.findIndex((t) => t.id === localStorage.getItem(STORAGE_KEYS.THEME)));
  const urlTheme = new URLSearchParams(window.location.search).get('theme');
  if (urlTheme === 'light') {
    const paperIdx = THEMES.findIndex((t) => t.id === 'paper-light');
    if (paperIdx >= 0) themeIdx = paperIdx;
  } else if (urlTheme === 'dark') {
    const paperIdx = THEMES.findIndex((t) => t.id === 'paper-light');
    if (themeIdx === paperIdx) themeIdx = 0;
  }
  let isPro = localStorage.getItem(STORAGE_KEYS.PRO) === '1';

  // Marquee state (1:1 Original MFP)
  let marqueeSource = '';
  let marqueeOffset = 0;
  let marqueeTimer = 0;

  // Web Audio Graph (lazy-initialized on first user gesture)
  let audioCtx = null;
  let analyser = null;
  let masterGain = null;
  let mediaSourceNode = null;
  let ambientPad = null;
  const audioEl = new Audio();
  audioEl.crossOrigin = 'anonymous';
  audioEl.preload = 'metadata';

  const sound = MfpUI.createSoundEngine({ volume: 0.9 });

  // DOM References
  const rootHtml = document.documentElement;
  const themeBtn = document.getElementById('theme-toggle');
  const themeLbl = document.getElementById('theme-lbl');
  const proBtn = document.getElementById('pro-toggle');
  const proLbl = document.getElementById('pro-lbl');

  const waveEls = [
    document.getElementById('wave-r0'),
    document.getElementById('wave-r1'),
    document.getElementById('wave-r2'),
    document.getElementById('wave-r3')
  ];
  const marqueeEl = document.getElementById('left-marquee');
  const miniPrev = document.getElementById('mini-prev');
  const miniRw = document.getElementById('mini-rw');
  const miniPlay = document.getElementById('mini-play');
  const miniFf = document.getElementById('mini-ff');
  const miniNext = document.getElementById('mini-next');
  const miniClock = document.getElementById('mini-clock');
  const miniVdown = document.getElementById('mini-vdown');
  const miniVol = document.getElementById('mini-vol');
  const miniVup = document.getElementById('mini-vup');
  const miniRandom = document.getElementById('mini-random');

  const btnInvert = document.getElementById('btn-invert');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const archiveStats = document.getElementById('archive-stats');
  const cookieBanner = document.getElementById('cookie-banner');
  const cookieOk = document.getElementById('cookie-ok');

  const viewEpisodes = document.getElementById('view-episodes');
  const viewAbout = document.getElementById('view-about');
  const viewCredits = document.getElementById('view-credits');
  const aboutBody = document.getElementById('about-body');
  const creditsBody = document.getElementById('credits-body');

  const epTitle = document.getElementById('ep-title');
  const btnPlay = document.getElementById('btn-play');
  const btnStop = document.getElementById('btn-stop');
  const btnRw = document.getElementById('btn-rw');
  const btnFf = document.getElementById('btn-ff');
  const btnSynth = document.getElementById('btn-synth');
  const epDuration = document.getElementById('ep-duration');
  const epSource = document.getElementById('ep-source');
  const epFilesize = document.getElementById('ep-filesize');
  const btnFav = document.getElementById('btn-fav');
  const epDate = document.getElementById('ep-date');
  const engineStatus = document.getElementById('engine-status');
  const epBody = document.getElementById('ep-body');
  const epTracklist = document.getElementById('ep-tracklist');
  const epLinks = document.getElementById('ep-links');

  const specModeAscii = document.getElementById('spec-mode-ascii');
  const specModeDots = document.getElementById('spec-mode-dots');
  const specChordNext = document.getElementById('spec-chord-next');

  const epFilterInput = document.getElementById('ep-filter');
  const epSortBtn = document.getElementById('ep-sort-btn');
  const epClearBtn = document.getElementById('ep-clear-btn');
  const epListEl = document.getElementById('ep-list');

  function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function formatHms(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  function formatMmSs(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  /* ==========================================================================
   * 1. Initialize Web Audio Graph & Procedural Ambient Synthesizer
   * ========================================================================== */
  function ensureAudioGraph() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
      analyser = audioCtx.createAnalyser();
      analyser.minDecibels = -114;
      analyser.maxDecibels = -30;
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.68;

      masterGain = audioCtx.createGain();
      masterGain.gain.value = Math.pow(volume, 1.666);

      try {
        mediaSourceNode = audioCtx.createMediaElementSource(audioEl);
        mediaSourceNode.connect(analyser);
      } catch (_) {}

      analyser.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      sound.setAudioContext(audioCtx);
      ambientPad = MfpUI.createAmbientPad({
        audioContext: audioCtx,
        analyser,
        outputNode: masterGain,
        preset: currentEp.order % 6,
        volume
      });
      spectrum.setAnalyser(analyser);
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  /* ==========================================================================
   * 2. Instantiate MfpUI Components (ASCII Bars, Spectrum, Flow Timer)
   * ========================================================================== */
  const progressBar = MfpUI.createAsciiBar(document.getElementById('ascii-progress'), {
    width: 28,
    value: 0,
    fillChar: '|',
    emptyChar: '.',
    sound,
    formatSuffix: () => {
      const cur = getCurrentTimeSec();
      const tot = getDurationSec();
      return `${formatMmSs(cur)} / ${formatMmSs(tot)}`;
    },
    onInput: (ratio) => {
      const targetSec = ratio * getDurationSec();
      if (synthMode) {
        synthTimeSec = targetSec;
        updateClocksUi();
      }
    },
    onChange: (ratio) => {
      seekToSeconds(ratio * getDurationSec());
    }
  });

  const volumeBar = MfpUI.createAsciiBar(document.getElementById('ascii-volume'), {
    width: 10,
    value: volume,
    prefix: 'Vol: ',
    fillChar: '|',
    emptyChar: '-',
    sound,
    formatSuffix: (val) => `${Math.round(val * 100)}%`,
    onInput: (val) => {
      setVolume(val, false);
    }
  });

  const spectrum = MfpUI.createSpectrum(document.getElementById('pro-spectrum'), {
    bands: 32,
    asciiRows: 6,
    dotRows: 12,
    mode: 'ascii',
    onWaveFrame: (waveRows) => {
      for (let i = 0; i < 4; i++) {
        if (waveEls[i] && waveRows[i]) {
          waveEls[i].textContent = waveRows[i];
        }
      }
    }
  });
  spectrum.start();

  MfpUI.createFlowTimer(document.getElementById('flow-timer'), {
    presets: [25 * 60, 50 * 60],
    sound
  });

  /* ==========================================================================
   * 3. Playback Engine (Hybrid MP3 Stream + Procedural Ambient Synth Fallback)
   * ========================================================================== */
  function getCurrentTimeSec() {
    if (synthMode) return synthTimeSec;
    if (pendingSeekSec !== null) return pendingSeekSec;
    return Number.isFinite(audioEl.currentTime) ? audioEl.currentTime : 0;
  }

  function applyPendingSeekIfReady() {
    if (pendingSeekSec === null || synthMode) return;
    if (audioEl.readyState >= 1) {
      const target = clamp(pendingSeekSec, 0, Math.max(0, getDurationSec() - 1));
      try {
        audioEl.currentTime = target;
        pendingSeekSec = null;
        updateClocksUi();
      } catch (_) {}
    }
  }

  function getDurationSec() {
    if (!synthMode && Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
      return audioEl.duration;
    }
    return currentEp.durationSec || 3600;
  }

  function updateEngineStatusText(customMsg) {
    if (customMsg) {
      engineStatus.innerHTML = customMsg;
      return;
    }
    if (synthMode) {
      const chordName = ambientPad ? ambientPad.getPreset().name : MfpUI.AMBIENT_CHORDS[currentEp.order % 6].name;
      engineStatus.innerHTML =
        `<span class="fuschia">// ENGINE: PROCEDURAL AMBIENT SYNTH</span> · <span class="green">[${chordName}]</span> · LFO 0.065Hz`;
    } else if (playState === 'playing') {
      engineStatus.innerHTML =
        `<span class="green">// ENGINE: MP3 STREAM ACTIVE</span> · <span class="grey">${currentEp.file.replace('https://', '')}</span>`;
    } else {
      engineStatus.innerHTML =
        `<span class="grey">// ENGINE: READY · STREAM [datashat.net] + SYNTH FALLBACK ARMED</span>`;
    }
  }

  function startSynthClock() {
    stopSynthClock();
    synthClockId = setInterval(() => {
      if (playState !== 'playing' || !synthMode) return;
      const tot = getDurationSec();
      synthTimeSec = (synthTimeSec + 0.25) % Math.max(1, tot);
      updateClocksUi();
    }, 250);
  }

  function stopSynthClock() {
    if (synthClockId) {
      clearInterval(synthClockId);
      synthClockId = 0;
    }
  }

  function clearStreamFallbackTimer() {
    if (streamFallbackTimer) {
      clearTimeout(streamFallbackTimer);
      streamFallbackTimer = 0;
    }
  }

  function activateProceduralSynthFallback(reason = 'MANUAL') {
    ensureAudioGraph();
    clearStreamFallbackTimer();
    try { audioEl.pause(); } catch (_) {}
    if (pendingSeekSec !== null) {
      synthTimeSec = pendingSeekSec;
      pendingSeekSec = null;
    }
    synthMode = true;
    btnSynth.classList.add('selected');
    btnSynth.textContent = '[Synth: ON]';

    const presetIdx = currentEp.order % MfpUI.AMBIENT_CHORDS.length;
    ambientPad.start(presetIdx);
    playState = 'playing';
    startSynthClock();
    syncTransportButtons();

    const chord = ambientPad.getPreset().name;
    if (reason === 'FALLBACK') {
      updateEngineStatusText(
        `<span class="yellow">// STREAM SLOW/OFFLINE → AUTO-ENGAGED PROCEDURAL SYNTH</span> · <span class="green">[${chord}]</span>`
      );
    } else {
      updateEngineStatusText();
    }
  }

  function playCurrentEpisode() {
    ensureAudioGraph();
    sound.beep();

    if (synthMode) {
      ambientPad.start(currentEp.order % MfpUI.AMBIENT_CHORDS.length);
      playState = 'playing';
      startSynthClock();
      syncTransportButtons();
      updateEngineStatusText();
      return;
    }

    // Stream Mode via same-origin audio proxy (for Web Audio AnalyserNode CORS) + 4.5s auto-fallback
    if (ambientPad && ambientPad.isPlaying()) ambientPad.stop();
    stopSynthClock();

    const targetSrc = `/api/audio?url=${encodeURIComponent(currentEp.file)}`;
    if (audioEl.dataset.epSlug !== currentEp.slug) {
      audioEl.dataset.epSlug = currentEp.slug;
      audioEl.src = targetSrc;
      audioEl.load();
    }

    playState = 'playing';
    syncTransportButtons();
    updateEngineStatusText(`<span class="yellow">// BUFFERING STREAM...</span> <span class="grey">(${currentEp.title})</span>`);

    clearStreamFallbackTimer();
    streamFallbackTimer = setTimeout(() => {
      if (playState === 'playing' && !synthMode && audioEl.readyState < 3 && audioEl.currentTime === 0) {
        activateProceduralSynthFallback('FALLBACK');
      }
    }, 4500);

    audioEl.play().then(() => {
      clearStreamFallbackTimer();
      applyPendingSeekIfReady();
      updateEngineStatusText();
    }).catch(() => {
      activateProceduralSynthFallback('FALLBACK');
    });
  }

  function pausePlayback() {
    ensureAudioGraph();
    sound.beep(4200);
    clearStreamFallbackTimer();
    playState = 'paused';
    if (synthMode) {
      if (ambientPad) ambientPad.stop();
      stopSynthClock();
    } else {
      try { audioEl.pause(); } catch (_) {}
    }
    syncTransportButtons();
    updateEngineStatusText(`<span class="orange">// PLAYBACK PAUSED</span> · <span class="grey">${formatHms(getCurrentTimeSec())}</span>`);
  }

  function stopPlayback() {
    ensureAudioGraph();
    sound.beep(3600);
    clearStreamFallbackTimer();
    playState = 'stopped';
    pendingSeekSec = null;
    synthTimeSec = 0;
    if (synthMode) {
      if (ambientPad) ambientPad.stop();
      stopSynthClock();
    } else {
      try {
        audioEl.pause();
        audioEl.currentTime = 0;
      } catch (_) {}
    }
    updateClocksUi();
    syncTransportButtons();
    updateEngineStatusText();
  }

  function togglePlayPause() {
    if (playState === 'playing') pausePlayback();
    else playCurrentEpisode();
  }

  function seekRelative(deltaSec) {
    ensureAudioGraph();
    sound.beep();
    seekToSeconds(getCurrentTimeSec() + deltaSec);
  }

  function seekToSeconds(targetSec) {
    const tot = getDurationSec();
    const clamped = clamp(targetSec, 0, Math.max(0, tot - 1));
    synthTimeSec = clamped;
    if (synthMode) {
      pendingSeekSec = null;
      if (ambientPad && ambientPad.isPlaying()) ambientPad.triggerShimmerNote();
    } else if (audioEl.src && audioEl.readyState >= 1) {
      pendingSeekSec = null;
      try {
        audioEl.currentTime = clamped;
      } catch (_) {
        pendingSeekSec = clamped;
      }
    } else {
      pendingSeekSec = clamped;
    }
    updateClocksUi();
  }

  function toggleSynthMode() {
    ensureAudioGraph();
    sound.switch(!synthMode);
    if (!synthMode) {
      synthTimeSec = getCurrentTimeSec();
      activateProceduralSynthFallback('MANUAL');
    } else {
      synthMode = false;
      btnSynth.classList.remove('selected');
      btnSynth.textContent = '[Synth Mode]';
      if (ambientPad) ambientPad.stop();
      stopSynthClock();
      if (playState === 'playing') {
        playCurrentEpisode();
      } else {
        updateEngineStatusText();
      }
    }
  }

  function setVolume(val, updateBar = true) {
    volume = clamp(val, 0.05, 1.0);
    localStorage.setItem(STORAGE_KEYS.VOL, String(volume));
    if (masterGain && audioCtx) {
      masterGain.gain.setTargetAtTime(Math.pow(volume, 1.666), audioCtx.currentTime, 0.03);
    }
    if (ambientPad) ambientPad.setVolume(volume);
    const pctStr = `${Math.round(volume * 100)}%`;
    miniVol.textContent = pctStr.padEnd(4, '\u00A0');
    if (updateBar) volumeBar.setValue(volume);
  }

  function updateClocksUi() {
    const cur = getCurrentTimeSec();
    const tot = getDurationSec();
    const ratio = tot > 0 ? clamp(cur / tot, 0, 1) : 0;
    progressBar.setValue(ratio);
    miniClock.textContent = formatHms(cur);
  }

  audioEl.addEventListener('loadedmetadata', () => {
    applyPendingSeekIfReady();
    if (!synthMode) updateClocksUi();
  });
  audioEl.addEventListener('canplay', () => {
    applyPendingSeekIfReady();
  });
  audioEl.addEventListener('timeupdate', () => {
    if (!synthMode) updateClocksUi();
  });
  audioEl.addEventListener('playing', () => {
    clearStreamFallbackTimer();
    applyPendingSeekIfReady();
    updateEngineStatusText();
  });
  audioEl.addEventListener('ended', () => {
    // Advance to previous/next episode or stop
    const nextEp = MFP_EPISODES.find((e) => e.order === currentEp.order - 1) || MFP_EPISODES[0];
    selectEpisode(nextEp, true);
  });

  function syncTransportButtons() {
    const isPlaying = playState === 'playing';
    btnPlay.textContent = isPlaying ? '[Pause]' : '[Play]';
    btnPlay.classList.toggle('selected', isPlaying);
    miniPlay.textContent = isPlaying ? '[stop]' : '[play]';
    renderEpisodeIndex();
  }

  /* ==========================================================================
   * 4. Left Column Marquee & Episode Selection with Cipher Scramble
   * ========================================================================== */
  function startMarquee(ep) {
    if (marqueeTimer) clearInterval(marqueeTimer);
    marqueeSource = `Episode\u00A0${ep.title.replace(/ /g, '\u00A0')}\u00A0//\u00A0`;
    marqueeOffset = 0;
    const tickMarquee = () => {
      let out = '';
      for (let i = 0; i < 32; i++) {
        out += marqueeSource[(marqueeOffset + i) % marqueeSource.length];
      }
      marqueeEl.textContent = out;
      marqueeOffset = (marqueeOffset + 1) % marqueeSource.length;
    };
    tickMarquee();
    marqueeTimer = setInterval(tickMarquee, 450);
  }

  function selectEpisode(ep, autoPlay = false) {
    if (!ep) return;
    currentEp = ep;
    synthTimeSec = 0;
    pendingSeekSec = null;

    if (currentView !== 'episodes') {
      switchView('episodes', false);
    }

    // Update URL hash cleanly without triggering page reload
    try {
      history.replaceState(null, '', `#${ep.slug}`);
    } catch (_) {}

    // Scramble Episode Header Title
    const [numPart, ...restParts] = ep.title.split(':');
    const curatorPart = restParts.join(':').trim();
    epTitle.innerHTML = `<span id="ep-title-num"></span><br class="hidden lg:inline"><span id="ep-title-cur"></span>`;
    MfpUI.scrambleText(document.getElementById('ep-title-num'), `Episode ${numPart}: `, { duration: 420 });
    MfpUI.scrambleText(document.getElementById('ep-title-cur'), curatorPart, { duration: 540, delay: 60 });

    // Metadata
    epDuration.textContent = ep.duration;
    epSource.href = ep.file;
    epFilesize.textContent = `${ep.sizeMb} MB`;
    epDate.textContent = `// ${ep.date}`;
    syncFavouriteButton();

    // Special episode body (e.g., Episode 62: Our Grey Lives)
    if (ep.body) {
      epBody.hidden = false;
      epBody.innerHTML = ep.body;
    } else {
      epBody.hidden = true;
      epBody.innerHTML = '';
    }

    // Tracklist with authentic cipher scramble transition
    renderTracklist(ep);

    // Curator External Links
    epLinks.innerHTML = ep.links
      .map((l) => `<a class="blue" href="${l.href}" target="_blank" rel="noopener">${l.label}</a><br>`)
      .join('');

    startMarquee(ep);
    updateClocksUi();
    renderEpisodeIndex();

    // Update Prev/Next button states
    const hasPrev = MFP_EPISODES.some((x) => x.order === ep.order - 1);
    const hasNext = MFP_EPISODES.some((x) => x.order === ep.order + 1);
    miniPrev.disabled = !hasPrev;
    miniPrev.className = hasPrev ? 'green hover' : 'grey pointer-events-none';
    miniNext.disabled = !hasNext;
    miniNext.className = hasNext ? 'green hover' : 'grey pointer-events-none';

    if (synthMode && ambientPad && playState === 'playing') {
      ambientPad.setPreset(ep.order % MfpUI.AMBIENT_CHORDS.length);
      updateEngineStatusText();
    } else if (autoPlay) {
      playCurrentEpisode();
    } else if (playState === 'playing') {
      playCurrentEpisode();
    } else {
      updateEngineStatusText();
    }

    // Smooth scroll middle column to top
    const colMain = document.getElementById('content');
    if (colMain) colMain.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderTracklist(ep) {
    epTracklist.innerHTML = '';
    const tracks = ep.tracklist || [];
    const totSec = ep.durationSec || 3600;

    tracks.forEach((trackName, idx) => {
      const row = document.createElement('div');
      row.className = 'track-row';

      const leftWrap = document.createElement('span');
      const idxSpan = document.createElement('span');
      idxSpan.className = 'track-idx pro-only';
      idxSpan.textContent = `${String(idx + 1).padStart(2, '0')}.`;

      const link = document.createElement('a');
      link.className = 'track-link subtle-hover';
      const query = encodeURIComponent(trackName).replace(/%20/g, '+');
      link.href = `https://www.google.com/search?q=site%3Adiscogs.com+${query}`;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = trackName;

      // Scramble each track line with staggered delay
      MfpUI.scrambleText(link, trackName, {
        duration: 380 + Math.min(280, idx * 14),
        delay: Math.min(320, idx * 18)
      });

      leftWrap.append(idxSpan, link);

      // Estimated timestamp seek button (hover or PRO mode)
      const estSec = Math.floor((idx / Math.max(1, tracks.length)) * totSec);
      const seekBtn = document.createElement('button');
      seekBtn.type = 'button';
      seekBtn.className = 'track-seek green hover';
      seekBtn.textContent = `[~${formatMmSs(estSec)}]`;
      seekBtn.title = `Jump to ~${formatMmSs(estSec)} in Episode ${ep.num}`;
      seekBtn.addEventListener('click', () => {
        if (playState !== 'playing') playCurrentEpisode();
        seekToSeconds(estSec);
      });

      row.append(leftWrap, seekBtn);
      epTracklist.appendChild(row);
    });
  }

  /* ==========================================================================
   * 5. Right Column: Full 79-Episode Matrix Index, Filter & Sort
   * ========================================================================== */
  function renderEpisodeIndex() {
    const q = filterQuery.trim().toLowerCase();
    let list = MFP_EPISODES.slice();
    if (!sortDesc) list.reverse();

    if (q) {
      list = list.filter((ep) => {
        if (ep.title.toLowerCase().includes(q) || ep.slug.includes(q)) return true;
        return ep.tracklist.some((t) => t.toLowerCase().includes(q));
      });
    }

    epClearBtn.hidden = !q;

    if (list.length === 0) {
      epListEl.innerHTML = `<span class="grey">// 0 episodes matching "${q}"</span>`;
      return;
    }

    const frag = document.createDocumentFragment();
    list.forEach((ep) => {
      const isSelected = ep.order === currentEp.order && currentView === 'episodes';
      const isFav = favourites.includes(ep.order);
      const isPlayingThis = isSelected && playState === 'playing';

      const item = document.createElement('a');
      item.href = `#${ep.slug}`;
      const classes = ['ep-item'];
      if (isSelected) classes.push('selected');
      if (isFav) classes.push('yellow');
      else if (ep.special) classes.push('purple');
      item.className = classes.join(' ');

      const em = document.createElement('em');
      em.textContent = ep.title;

      if (isPlayingThis) {
        const playDot = document.createElement('span');
        playDot.className = 'ep-item__playing';
        playDot.textContent = '▶';
        item.appendChild(playDot);
      }
      item.appendChild(em);

      item.addEventListener('click', (e) => {
        e.preventDefault();
        sound.tick(1.0);
        selectEpisode(ep, true);
      });

      frag.appendChild(item);
      frag.appendChild(document.createElement('br'));
    });

    epListEl.innerHTML = '';
    epListEl.appendChild(frag);
  }

  // Responsive mount: move episode index between desktop right column and tablet left column
  function syncResponsiveIndexMount() {
    const desktopMount = document.getElementById('desktop-index-mount');
    const tabletMount = document.getElementById('tablet-index-mount');
    const panel = document.getElementById('ep-index-panel');
    if (!desktopMount || !tabletMount || !panel) return;
    const w = window.innerWidth;
    if (w >= 768 && w < 1024) {
      if (panel.parentElement !== tabletMount) {
        tabletMount.append(panel, epListEl);
      }
    } else if (panel.parentElement !== desktopMount) {
      desktopMount.prepend(epListEl);
      desktopMount.prepend(panel);
    }
  }
  window.addEventListener('resize', syncResponsiveIndexMount);

  /* ==========================================================================
   * 6. Favourites, Views (Episodes / About / Credits), Theme & RAW/PRO Mode
   * ========================================================================== */
  function syncFavouriteButton() {
    const isFav = favourites.includes(currentEp.order);
    btnFav.textContent = isFav ? '[forget]' : '[favourite]';
  }

  function toggleFavourite() {
    sound.tick(1.2);
    const ord = currentEp.order;
    if (favourites.includes(ord)) {
      favourites = favourites.filter((x) => x !== ord);
    } else {
      favourites.push(ord);
    }
    localStorage.setItem(STORAGE_KEYS.FAVS, JSON.stringify(favourites));
    syncFavouriteButton();
    renderEpisodeIndex();
  }

  function switchView(viewName, playSound = true) {
    if (playSound) sound.tick(0.95);
    currentView = viewName;
    viewEpisodes.hidden = viewName !== 'episodes';
    viewAbout.hidden = viewName !== 'about';
    viewCredits.hidden = viewName !== 'credits';

    document.querySelectorAll('[data-view-btn]').forEach((btn) => {
      const match = btn.getAttribute('data-view-btn') === viewName;
      btn.classList.toggle('selected', match);
    });

    if (viewName === 'about') {
      MfpUI.scrambleText(document.getElementById('about-title'), 'About', { duration: 400 });
    } else if (viewName === 'credits') {
      MfpUI.scrambleText(document.getElementById('credits-title'), 'Credits', { duration: 400 });
    }
    renderEpisodeIndex();
  }

  function applyTheme(idx, playSound = false) {
    themeIdx = (idx + THEMES.length) % THEMES.length;
    const t = THEMES[themeIdx];
    rootHtml.setAttribute('data-theme', t.id);
    document.body.classList.toggle('invert', t.id === 'paper-light');
    themeLbl.textContent = t.label;
    localStorage.setItem(STORAGE_KEYS.THEME, t.id);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', t.color);
    if (playSound) sound.switch(t.id !== 'paper-light');
  }

  function applyProMode(nextPro, playSound = false) {
    isPro = !!nextPro;
    rootHtml.setAttribute('data-pro', isPro ? '1' : '0');
    proBtn.setAttribute('aria-pressed', isPro ? 'true' : 'false');
    proLbl.textContent = isPro ? 'PRO' : 'RAW';
    localStorage.setItem(STORAGE_KEYS.PRO, isPro ? '1' : '0');
    if (playSound) sound.switch(isPro);
  }

  /* ==========================================================================
   * 7. Event Listeners & Full Geek Keyboard Shortcuts
   * ========================================================================== */
  btnPlay.addEventListener('click', togglePlayPause);
  btnStop.addEventListener('click', stopPlayback);
  btnRw.addEventListener('click', () => seekRelative(-30));
  btnFf.addEventListener('click', () => seekRelative(30));
  btnSynth.addEventListener('click', toggleSynthMode);
  btnFav.addEventListener('click', toggleFavourite);

  miniPlay.addEventListener('click', togglePlayPause);
  miniRw.addEventListener('click', () => seekRelative(-30));
  miniFf.addEventListener('click', () => seekRelative(30));
  miniPrev.addEventListener('click', () => {
    const prev = MFP_EPISODES.find((x) => x.order === currentEp.order - 1);
    if (prev) selectEpisode(prev, true);
  });
  miniNext.addEventListener('click', () => {
    const next = MFP_EPISODES.find((x) => x.order === currentEp.order + 1);
    if (next) selectEpisode(next, true);
  });
  miniVdown.addEventListener('click', () => {
    sound.beep();
    setVolume(volume - 0.05);
  });
  miniVup.addEventListener('click', () => {
    sound.beep();
    setVolume(volume + 0.05);
  });
  miniRandom.addEventListener('click', () => {
    sound.beep();
    pickRandomEpisode();
  });

  function pickRandomEpisode() {
    const pool = MFP_EPISODES.filter((x) => x.order !== currentEp.order);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || MFP_EPISODES[0];
    selectEpisode(chosen, true);
  }

  themeBtn.addEventListener('click', () => applyTheme(themeIdx + 1, true));
  proBtn.addEventListener('click', () => applyProMode(!isPro, true));

  btnInvert.addEventListener('click', () => {
    const paperIdx = THEMES.findIndex((t) => t.id === 'paper-light');
    applyTheme(themeIdx === paperIdx ? 0 : paperIdx, true);
  });

  btnFullscreen.addEventListener('click', () => {
    sound.tick();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  });

  document.querySelectorAll('[data-view-btn], [data-view-link]').forEach((el) => {
    el.addEventListener('click', () => {
      const v = el.getAttribute('data-view-btn') || el.getAttribute('data-view-link');
      if (v) switchView(v, true);
    });
  });

  specModeAscii.addEventListener('click', () => {
    sound.tick(0.9);
    spectrum.setMode('ascii');
    specModeAscii.classList.add('selected');
    specModeDots.classList.remove('selected');
  });

  specModeDots.addEventListener('click', () => {
    sound.tick(1.1);
    spectrum.setMode('dots');
    specModeDots.classList.add('selected');
    specModeAscii.classList.remove('selected');
  });

  specChordNext.addEventListener('click', () => {
    ensureAudioGraph();
    sound.tick(1.25);
    const nextIdx = (ambientPad.getPresetIndex() + 1) % MfpUI.AMBIENT_CHORDS.length;
    ambientPad.setPreset(nextIdx);
    if (!synthMode) toggleSynthMode();
    else updateEngineStatusText();
  });

  epFilterInput.addEventListener('input', () => {
    filterQuery = epFilterInput.value;
    renderEpisodeIndex();
  });

  epClearBtn.addEventListener('click', () => {
    epFilterInput.value = '';
    filterQuery = '';
    renderEpisodeIndex();
  });

  epSortBtn.addEventListener('click', () => {
    sound.tick();
    sortDesc = !sortDesc;
    epSortBtn.textContent = sortDesc ? '[Desc ↓]' : '[Asc ↑]';
    renderEpisodeIndex();
  });

  if (localStorage.getItem(STORAGE_KEYS.COOKIE) === '1') {
    cookieBanner.hidden = true;
  }
  cookieOk.addEventListener('click', () => {
    sound.tick();
    cookieBanner.hidden = true;
    localStorage.setItem(STORAGE_KEYS.COOKIE, '1');
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toUpperCase() : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;

    const k = e.key.toLowerCase();
    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seekRelative(-30);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      seekRelative(30);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      sound.tick(1.1);
      setVolume(volume + 0.05);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      sound.tick(0.85);
      setVolume(volume - 0.05);
    } else if (k === 'r') {
      e.preventDefault();
      sound.beep();
      pickRandomEpisode();
    } else if (k === 't') {
      e.preventDefault();
      applyTheme(themeIdx + 1, true);
    } else if (k === 'p') {
      e.preventDefault();
      applyProMode(!isPro, true);
    } else if (k === 's') {
      e.preventDefault();
      toggleSynthMode();
    }
  });

  /* ==========================================================================
   * 8. Boot & Hydrate Initial Route / Episode
   * ========================================================================== */
  function init() {
    aboutBody.innerHTML = MFP_META.aboutHtml;
    creditsBody.innerHTML = MFP_META.creditsHtml;
    archiveStats.innerHTML =
      `<br>// ${MFP_META.totalEpisodes} episodes<br>` +
      `// ${MFP_META.totalTracks} tracks<br>` +
      `// ${MFP_META.totalHours} hours<br>` +
      `// ${MFP_META.totalMinutes} minutes<br>` +
      `// ${MFP_META.totalSeconds} seconds`;

    applyTheme(themeIdx, false);
    applyProMode(isPro, false);
    setVolume(volume, true);
    syncResponsiveIndexMount();

    // Check URL hash or pathname for initial episode or view
    const hash = location.hash.replace(/^#/, '').trim().toLowerCase();
    const pathSeg = location.pathname.split('/').filter(Boolean).pop() || '';
    const slugTarget = hash || pathSeg;

    if (slugTarget === 'about') {
      selectEpisode(MFP_EPISODES[0], false);
      switchView('about', false);
    } else if (slugTarget === 'credits') {
      selectEpisode(MFP_EPISODES[0], false);
      switchView('credits', false);
    } else {
      const matched = MFP_EPISODES.find(
        (ep) => ep.slug === slugTarget || ep.num === slugTarget || String(ep.order) === slugTarget
      );
      selectEpisode(matched || MFP_EPISODES[0], false);
    }
  }

  init();

  /* --- Decon-Web Parent Stage Bridge (Progressive Back / Shortcuts / Top-Left Wake) --- */
  if (window.parent && window.parent !== window) {
    const notifyStageBack = (e) => {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      window.parent.postMessage({ type: 'decon:stage-back' }, '*');
    };

    const handleProgressiveBack = (e) => {
      if (currentView !== 'episodes') {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        switchView('episodes', true);
        return;
      }
      notifyStageBack(e);
    };

    // 1. 捕获键盘返回宏：Escape / BrowserBack / Alt+ArrowLeft / 非输入框 Backspace
    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) || '';
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable);
      if (
        e.key === 'Escape' ||
        e.key === 'BrowserBack' ||
        (e.altKey && e.key === 'ArrowLeft') ||
        (!isInput && e.key === 'Backspace')
      ) {
        handleProgressiveBack(e);
      }
    }, true);

    // 2. 捕获鼠标侧键返回（Mouse Button 4 / XButton1: e.button === 3）
    const onMouseBackBtn = (e) => {
      if (e.button === 3) {
        handleProgressiveBack(e);
      }
    };
    window.addEventListener('mouseup', onMouseBackBtn, true);
    window.addEventListener('auxclick', onMouseBackBtn, true);

    // 3. 同步左上角指针靠近状态给父窗口（双重保障唤醒左上角 Logo）
    let lastTopLeftState = false;
    window.addEventListener('pointermove', (e) => {
      const inTopLeft = e.clientX <= 260 && e.clientY <= 105;
      if (inTopLeft !== lastTopLeftState) {
        lastTopLeftState = inTopLeft;
        window.parent.postMessage({ type: 'decon:stage-top-left', active: inTopLeft }, '*');
      }
    }, { passive: true });
  }
})();
