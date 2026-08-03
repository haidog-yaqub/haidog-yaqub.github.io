(function () {
  function initMidiPanel() {
    const root = document.querySelector("[data-midi-player-panel]");
    if (!root) return;

    const player = root.querySelector("[data-midi-el]");
    const visualizer = root.querySelector("#midi-kit-visualizer") || root.querySelector("midi-visualizer");
    const tracks = Array.from(root.querySelectorAll("[data-midi-track]"));
    const rows = Array.from(root.querySelectorAll(".split-player-track-row"));
    const titleEl = root.querySelector("[data-midi-title]");
    const prevBtn = root.querySelector("[data-midi-prev]");
    const nextBtn = root.querySelector("[data-midi-next]");
    const playBtn = root.querySelector("[data-midi-play]");
    const playIcon = root.querySelector("[data-midi-play-icon]");
    const seekEl = root.querySelector("[data-midi-seek]");
    const fillEl = root.querySelector("[data-midi-seek-fill]");
    const thumbEl = root.querySelector("[data-midi-seek-thumb]");
    const currentEl = root.querySelector("[data-midi-current]");
    const durationEl = root.querySelector("[data-midi-duration]");

    if (!player || !tracks.length) return;

    let index = 0;
    let scrubbing = false;
    let rafId = 0;

    function resetVisualizerView() {
      if (!visualizer) return;
      try {
        if (typeof visualizer.clearActiveNotes === "function") {
          visualizer.clearActiveNotes();
        }
      } catch (_) {}

      const nodes = [visualizer];
      if (visualizer.shadowRoot) {
        nodes.push(...visualizer.shadowRoot.querySelectorAll("*"));
      }
      nodes.push(...visualizer.querySelectorAll("*"));
      nodes.forEach((el) => {
        try {
          el.scrollLeft = 0;
          el.scrollTop = 0;
        } catch (_) {}
      });
    }

    function syncVisualizer() {
      if (!visualizer) return;
      try {
        if (typeof visualizer.clearActiveNotes === "function") {
          visualizer.clearActiveNotes();
        }
        visualizer.noteSequence = null;
        if (player.noteSequence) {
          visualizer.noteSequence = player.noteSequence;
        } else if (typeof visualizer.reload === "function") {
          visualizer.reload();
        }
        if (typeof visualizer.redraw === "function") {
          visualizer.redraw();
        }
      } catch (_) {}

      resetVisualizerView();
      requestAnimationFrame(() => {
        resetVisualizerView();
        requestAnimationFrame(resetVisualizerView);
      });
      setTimeout(resetVisualizerView, 50);
      setTimeout(resetVisualizerView, 150);
    }

    function formatTime(sec) {
      if (!isFinite(sec) || sec < 0) return "0:00";
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return m + ":" + String(s).padStart(2, "0");
    }

    function getDuration() {
      const d = Number(player.duration);
      return isFinite(d) && d > 0 ? d : 0;
    }

    let lastKnownTime = 0;

    function getCurrentTime() {
      // html-midi-player only advances currentTime when notes fire.
      const fromPlayer = Number(player.currentTime);
      if (isFinite(fromPlayer) && fromPlayer >= 0) {
        lastKnownTime = Math.max(lastKnownTime, fromPlayer);
        return lastKnownTime;
      }
      return lastKnownTime;
    }

    function setProgress(ratio) {
      const pct = Math.max(0, Math.min(1, ratio)) * 100;
      if (fillEl) fillEl.style.width = pct + "%";
      if (thumbEl) thumbEl.style.left = pct + "%";
      if (seekEl) seekEl.setAttribute("aria-valuenow", String(Math.round(pct * 10)));
    }

    function ratioFromPointer(event) {
      if (!seekEl) return 0;
      const rect = seekEl.getBoundingClientRect();
      if (!rect.width) return 0;
      const x = (event.clientX != null ? event.clientX : 0) - rect.left;
      return Math.max(0, Math.min(1, x / rect.width));
    }

    function seekToRatio(ratio, updatePlayer) {
      const duration = getDuration();
      const safe = Math.max(0, Math.min(1, ratio));
      setProgress(safe);
      if (duration) {
        const t = safe * duration;
        lastKnownTime = t;
        if (currentEl) currentEl.textContent = formatTime(t);
        if (updatePlayer) {
          try {
            player.currentTime = t;
          } catch (_) {}
        }
      }
    }

    function updateProgress() {
      if (!currentEl || !durationEl) return;
      const duration = getDuration();
      durationEl.textContent = formatTime(duration);
      if (scrubbing || !duration) return;
      const t = getCurrentTime();
      currentEl.textContent = formatTime(t);
      setProgress(t / duration);
    }

    function stopProgressLoop() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function startProgressLoop() {
      stopProgressLoop();
      const tick = () => {
        updateProgress();
        if (player.playing) {
          rafId = requestAnimationFrame(tick);
        } else {
          rafId = 0;
        }
      };
      rafId = requestAnimationFrame(tick);
    }

    function setPlaying(isPlaying) {
      root.classList.toggle("is-playing", isPlaying);
      if (playIcon) {
        playIcon.classList.toggle("fa-play", !isPlaying);
        playIcon.classList.toggle("fa-pause", isPlaying);
      }
      if (playBtn) {
        playBtn.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
      }
      if (isPlaying) {
        startProgressLoop();
      } else {
        stopProgressLoop();
        updateProgress();
      }
    }

    function resetProgress() {
      scrubbing = false;
      lastKnownTime = 0;
      setProgress(0);
      if (currentEl) currentEl.textContent = "0:00";
      if (durationEl) durationEl.textContent = "0:00";
    }

    function loadTrack(i, autoplay) {
      index = (i + tracks.length) % tracks.length;
      const track = tracks[index];
      const url = track.dataset.url;
      const title = track.dataset.title || "";

      tracks.forEach((el, n) => el.classList.toggle("is-active", n === index));
      rows.forEach((el, n) => el.classList.toggle("is-active", n === index));
      if (titleEl) titleEl.textContent = title;

      try {
        if (player.playing) player.stop();
      } catch (_) {}

      resetVisualizerView();

      player.src = url;
      if (visualizer) {
        try {
          visualizer.src = url;
        } catch (_) {}
      }
      setPlaying(false);
      resetProgress();

      if (autoplay) {
        const tryStart = () => {
          try {
            player.start();
          } catch (_) {}
        };
        player.addEventListener("load", tryStart, { once: true });
        setTimeout(tryStart, 120);
      }
    }

    playBtn.addEventListener("click", () => {
      try {
        if (player.playing) {
          player.stop();
          setPlaying(false);
        } else {
          player.start();
          setPlaying(true);
        }
      } catch (_) {}
    });

    prevBtn.addEventListener("click", () => loadTrack(index - 1, true));
    nextBtn.addEventListener("click", () => loadTrack(index + 1, true));

    tracks.forEach((track) => {
      track.addEventListener("click", () => {
        loadTrack(Number(track.dataset.index), true);
      });
    });

    player.addEventListener("load", () => {
      updateProgress();
      syncVisualizer();
    });

    player.addEventListener("start", () => {
      setPlaying(true);
      syncVisualizer();
    });
    player.addEventListener("note", (event) => {
      const note = event && event.detail && event.detail.note;
      const t = note && Number(note.startTime);
      if (isFinite(t) && t >= 0) {
        lastKnownTime = t;
        if (!scrubbing) updateProgress();
      }
    });
    player.addEventListener("stop", (event) => {
      setPlaying(false);
      const finished = event && event.detail && event.detail.finished;
      if (finished) {
        loadTrack(index + 1, true);
      } else {
        updateProgress();
      }
    });

    if (seekEl) {
      const onPointerMove = (event) => {
        if (!scrubbing) return;
        seekToRatio(ratioFromPointer(event), true);
      };

      const onPointerUp = (event) => {
        if (!scrubbing) return;
        scrubbing = false;
        seekToRatio(ratioFromPointer(event), true);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      };

      seekEl.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        scrubbing = true;
        seekToRatio(ratioFromPointer(event), true);
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
      });

      seekEl.addEventListener("keydown", (event) => {
        const duration = getDuration();
        if (!duration) return;
        let delta = 0;
        if (event.key === "ArrowRight" || event.key === "Right") delta = 5;
        if (event.key === "ArrowLeft" || event.key === "Left") delta = -5;
        if (!delta) return;
        event.preventDefault();
        const next = Math.max(0, Math.min(duration, getCurrentTime() + delta));
        seekToRatio(next / duration, true);
      });
    }

    loadTrack(0, false);
  }

  if (window.customElements && customElements.whenDefined) {
    customElements.whenDefined("midi-player").then(initMidiPanel).catch(initMidiPanel);
  } else {
    window.addEventListener("load", initMidiPanel);
  }
})();
