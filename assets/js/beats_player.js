(function () {
  const root = document.querySelector("[data-beats-player]");
  if (!root) return;

  const audio = root.querySelector("[data-beats-audio]");
  const tracks = Array.from(root.querySelectorAll("[data-beats-track]"));
  if (!audio || !tracks.length) return;

  const titleEl = root.querySelector("[data-beats-title]");
  const coverImg = root.querySelector("[data-beats-cover-img]");
  const coverFallback = root.querySelector("[data-beats-cover-fallback]");
  const playBtn = root.querySelector("[data-beats-play]");
  const playIcon = root.querySelector("[data-beats-play-icon]");
  const prevBtn = root.querySelector("[data-beats-prev]");
  const nextBtn = root.querySelector("[data-beats-next]");
  const seekEl = root.querySelector("[data-beats-seek]");
  const fillEl = root.querySelector("[data-beats-seek-fill]");
  const thumbEl = root.querySelector("[data-beats-seek-thumb]");
  const currentEl = root.querySelector("[data-beats-current]");
  const durationEl = root.querySelector("[data-beats-duration]");

  let index = 0;
  let scrubbing = false;
  let playToken = 0;

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + String(s).padStart(2, "0");
  }

  function getDuration() {
    const d = audio.duration;
    return isFinite(d) && d > 0 ? d : 0;
  }

  function setProgress(ratio) {
    const pct = Math.max(0, Math.min(1, ratio)) * 100;
    if (fillEl) fillEl.style.width = pct + "%";
    if (thumbEl) thumbEl.style.left = pct + "%";
    if (seekEl) seekEl.setAttribute("aria-valuenow", String(Math.round(pct * 10)));
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
  }

  function tryPlay(token) {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          if (token === playToken) setPlaying(true);
        })
        .catch((err) => {
          // A newer load/play superseded this attempt.
          if (token !== playToken) return;
          if (err && err.name === "AbortError") return;
          setPlaying(false);
        });
    } else {
      setPlaying(!audio.paused);
    }
  }

  function playWhenReady() {
    const token = ++playToken;
    if (audio.readyState >= 2) {
      tryPlay(token);
      return;
    }
    const onReady = () => {
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("loadeddata", onReady);
      if (token !== playToken) return;
      tryPlay(token);
    };
    audio.addEventListener("canplay", onReady);
    audio.addEventListener("loadeddata", onReady);
  }

  function ratioFromPointer(event) {
    if (!seekEl) return 0;
    const rect = seekEl.getBoundingClientRect();
    if (!rect.width) return 0;
    const x = (event.clientX != null ? event.clientX : 0) - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }

  function seekToRatio(ratio, updateAudio) {
    const duration = getDuration();
    const safe = Math.max(0, Math.min(1, ratio));
    setProgress(safe);
    if (duration) {
      const t = safe * duration;
      currentEl.textContent = formatTime(t);
      if (updateAudio) {
        try {
          audio.currentTime = t;
        } catch (_) {}
      }
    }
  }

  function loadTrack(i, autoplay) {
    index = (i + tracks.length) % tracks.length;
    const track = tracks[index];
    const url = track.dataset.url;
    const title = track.dataset.title || "";
    const cover = track.dataset.cover || "";

    tracks.forEach((el, n) => el.classList.toggle("is-active", n === index));

    if (titleEl) titleEl.textContent = title;

    if (coverImg && coverFallback) {
      if (cover) {
        coverImg.src = cover;
        coverImg.alt = title;
        coverImg.hidden = false;
        coverFallback.hidden = true;
      } else {
        coverImg.removeAttribute("src");
        coverImg.hidden = true;
        coverFallback.hidden = false;
        coverFallback.textContent = title ? title.charAt(0).toUpperCase() : "♪";
      }
    }

    scrubbing = false;
    playToken += 1;
    // Bust stale browser cache of previously mislabeled M4A-as-MP3 files.
    audio.src = url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=2";
    audio.load();
    setProgress(0);
    currentEl.textContent = "0:00";
    durationEl.textContent = "0:00";

    if (autoplay) {
      playWhenReady();
    } else {
      setPlaying(false);
    }
  }

  playBtn.addEventListener("click", () => {
    if (audio.paused) {
      playWhenReady();
    } else {
      playToken += 1;
      audio.pause();
      setPlaying(false);
    }
  });

  prevBtn.addEventListener("click", () => loadTrack(index - 1, true));
  nextBtn.addEventListener("click", () => loadTrack(index + 1, true));

  tracks.forEach((track) => {
    track.addEventListener("click", () => {
      loadTrack(Number(track.dataset.index), true);
    });
  });

  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(getDuration());
  });
  audio.addEventListener("durationchange", () => {
    durationEl.textContent = formatTime(getDuration());
  });
  audio.addEventListener("timeupdate", () => {
    if (scrubbing) return;
    const duration = getDuration();
    if (!duration) return;
    currentEl.textContent = formatTime(audio.currentTime);
    setProgress(audio.currentTime / duration);
  });
  audio.addEventListener("ended", () => loadTrack(index + 1, true));
  audio.addEventListener("pause", () => setPlaying(false));
  audio.addEventListener("play", () => setPlaying(true));

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
      const next = Math.max(0, Math.min(duration, audio.currentTime + delta));
      seekToRatio(next / duration, true);
    });
  }

  loadTrack(0, false);
})();
