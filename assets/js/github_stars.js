(function () {
  const elements = Array.from(document.querySelectorAll("[data-github-repo]"));
  if (!elements.length) return;

  const repos = [...new Set(elements.map((el) => el.getAttribute("data-github-repo")).filter(Boolean))];
  const cacheTtlMs = 60 * 60 * 1000;

  function formatCount(n) {
    const count = Number(n) || 0;
    if (count >= 1000) {
      const k = count / 1000;
      return (k >= 10 ? Math.round(k) : Math.round(k * 10) / 10) + "k";
    }
    return String(count);
  }

  function render(repo, stars) {
    document.querySelectorAll(`[data-github-repo="${repo}"]`).forEach((el) => {
      const countEl = el.querySelector(".open-source-stars-count");
      if (!countEl) return;
      countEl.textContent = formatCount(stars);
      el.hidden = false;
    });
  }

  const uncached = [];
  repos.forEach((repo) => {
    const cacheKey = `githubStars:${repo}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { stars, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < cacheTtlMs) {
          render(repo, stars);
          return;
        }
      } catch (_) {}
    }
    uncached.push(repo);
  });

  uncached.forEach((repo) => {
    fetch(`https://api.github.com/repos/${repo}`)
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
        // Keep the star badge hidden if the request fails.
      });
  });
})();
