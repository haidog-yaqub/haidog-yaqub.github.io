(function () {
  const items = Array.from(document.querySelectorAll(".open-source-item[data-github-repo]"));
  if (!items.length) return;

  const repos = [...new Set(items.map((el) => el.getAttribute("data-github-repo")).filter(Boolean))];
  const cacheTtlMs = 60 * 60 * 1000;
  const starsByRepo = {};

  function formatCount(n) {
    const count = Number(n) || 0;
    if (count >= 1000) {
      const k = count / 1000;
      return (k >= 10 ? Math.round(k) : Math.round(k * 10) / 10) + "k";
    }
    return String(count);
  }

  function render(repo, stars) {
    starsByRepo[repo] = Number(stars) || 0;
    document.querySelectorAll(`.open-source-item[data-github-repo="${repo}"]`).forEach((el) => {
      const badge = el.querySelector(".open-source-stars");
      const countEl = el.querySelector(".open-source-stars-count");
      if (!badge || !countEl) return;
      countEl.textContent = formatCount(stars);
      badge.hidden = false;
    });
  }

  function sortSections() {
    document.querySelectorAll(".open-source-section").forEach((section) => {
      const rows = Array.from(section.querySelectorAll(".open-source-item"));
      if (rows.length < 2) return;

      rows.sort((a, b) => {
        const aRepo = a.getAttribute("data-github-repo");
        const bRepo = b.getAttribute("data-github-repo");
        const aStars = aRepo && starsByRepo[aRepo] != null ? starsByRepo[aRepo] : -1;
        const bStars = bRepo && starsByRepo[bRepo] != null ? starsByRepo[bRepo] : -1;
        return bStars - aStars;
      });

      rows.forEach((row) => section.appendChild(row));
    });
  }

  function readCache(repo) {
    const cached = localStorage.getItem(`githubStars:${repo}`);
    if (!cached) return null;
    try {
      const { stars, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheTtlMs) return stars;
    } catch (_) {}
    return null;
  }

  const fetches = repos.map((repo) => {
    const cachedStars = readCache(repo);
    if (cachedStars != null) {
      render(repo, cachedStars);
      return Promise.resolve();
    }

    return fetch(`https://api.github.com/repos/${repo}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data) => {
        const stars = data.stargazers_count || 0;
        localStorage.setItem(
          `githubStars:${repo}`,
          JSON.stringify({ stars, timestamp: Date.now() })
        );
        render(repo, stars);
      })
      .catch(() => {
        // Leave badge hidden; treat as 0 for sorting.
        starsByRepo[repo] = 0;
      });
  });

  Promise.all(fetches).then(sortSections);
})();
