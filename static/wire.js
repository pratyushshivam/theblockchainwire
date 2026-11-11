// Relative times, scroll reveals and the wire filter. The page works without any of it.
document.documentElement.classList.add("js");
(() => {
  const rel = (d) => {
    const s = (Date.now() - d) / 1000;
    if (s < 0 || s > 86400 * 2) return null;
    if (s < 90) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    return "yesterday";
  };
  const tick = () => document.querySelectorAll("time[data-rel]").forEach((t) => { const r = rel(new Date(t.dateTime)); if (r) { if (!t.title) t.title = t.textContent; t.textContent = r; } });
  tick(); setInterval(tick, 60000);

  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" }) : null;
  document.querySelectorAll(".rv").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));

  const rows = [...document.querySelectorAll("#rows .row")], q = document.getElementById("q"), count = document.getElementById("count"), none = document.getElementById("none");
  if (!rows.length || !q) return;
  let sec = "";
  const apply = () => {
    const term = q.value.trim().toLowerCase(); let n = 0;
    rows.forEach((r) => { const ok = (!sec || r.dataset.c === sec) && (!term || r.textContent.toLowerCase().includes(term)); r.hidden = !ok; if (ok) n++; });
    count.textContent = n + (n === 1 ? " story" : " stories"); none.hidden = n > 0;
  };
  document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => { document.querySelector(".tabs .on")?.classList.remove("on"); b.classList.add("on"); sec = b.dataset.f; apply(); }));
  q.addEventListener("input", apply);
})();
