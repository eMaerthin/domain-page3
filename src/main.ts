import "./style.css";

type Locale = "en" | "pl";

const locale: Locale = navigator.language.toLowerCase().startsWith("pl") ? "pl" : "en";
let currentLocale = locale;
let selectedVideoId = "";
let demoData: any;

const text = {
  en: {
    eyebrow: "Creator intelligence / cached demo",
    title: "Find the peak.",
    subtitle: "A static, instant preview of what makes MrBeast’s public content perform.",
    demo: "DEMO PROFILE",
    explore: "Explore the full demo",
    videos: "videos",
    subscribers: "subscribers",
    analyzed: "analyzed",
    top: "Top performers",
    bottom: "Needs attention",
    recent: "Recent signal",
    pattern: "What stands out",
    distribution: "Performance distribution",
    distributionHelp: "Every dot is a video. Violet marks the strongest tail, green the selected sample, and gray the rest of the observed catalog.",
    predictive: "Predictive model",
    shap: "Explainable AI (SHAP)",
    shapHelp: "SHAP shows which observable features move a model prediction up or down. It describes the model, not causality.",
    causal: "Causal exploration",
    causalHelp: "Observational comparisons are shown only when sample size and overlap support a responsible interpretation.",
    watch: "Watch on YouTube",
    views: "views",
    likes: "likes",
    print: "Print report",
    language: "PL / EN",
    baseline: "chronological baseline",
    selected: "Selected for analysis",
    noCausal: "No treatment met the sample and overlap conditions. No unreliable causal claim is shown.",
    modelUnavailable: "The cached demo has no reliable SHAP model for this snapshot.",
  },
  pl: {
    eyebrow: "Inteligencja twórców / demo z cache",
    title: "Znajdź szczyt.",
    subtitle: "Statyczny, natychmiastowy podgląd tego, co napędza publiczne treści MrBeasta.",
    demo: "PROFIL DEMO",
    explore: "Otwórz pełne demo",
    videos: "filmów",
    subscribers: "subskrybentów",
    analyzed: "przeanalizowano",
    top: "Najlepsze filmy",
    bottom: "Wymaga uwagi",
    recent: "Ostatni sygnał",
    pattern: "Najważniejsze wzorce",
    distribution: "Rozkład wyników",
    distributionHelp: "Każda kropka to film. Fiolet oznacza najmocniejszy ogon, zieleń wybraną próbę, a szarość resztę katalogu.",
    predictive: "Model predykcyjny",
    shap: "Wyjaśnialne AI (SHAP)",
    shapHelp: "SHAP pokazuje, które obserwowalne cechy podnoszą lub obniżają predykcję modelu. Nie opisuje przyczynowości.",
    causal: "Analiza przyczynowa",
    causalHelp: "Porównania obserwacyjne pokazujemy tylko wtedy, gdy liczebność i nakładanie grup pozwalają na odpowiedzialną interpretację.",
    watch: "Otwórz na YouTube",
    views: "wyświetleń",
    likes: "polubień",
    print: "Drukuj raport",
    language: "EN / PL",
    baseline: "chronologiczny model bazowy",
    selected: "Wybrane do analizy",
    noCausal: "Żaden wariant nie spełnił warunków liczebności i nakładania grup. Nie pokazujemy niewiarygodnego wniosku przyczynowego.",
    modelUnavailable: "W tym zrzucie demo nie ma wiarygodnego modelu SHAP.",
  },
} as const;

const $ = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;
const format = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat(currentLocale).format(value);
const compact = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat(currentLocale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
const date = (value: string | null | undefined) => value ? new Intl.DateTimeFormat(currentLocale, { dateStyle: "medium" }).format(new Date(value)) : "—";
const score = (video: any) => Number(video?.perf_score ?? video?.performance_score ?? 0);

function report(): any {
  return demoData;
}

function card(video: any, rank: number): string {
  const t = text[currentLocale];
  return `<article class="video-card">
    <div class="rank">#${rank}</div>
    <img loading="lazy" src="${video.thumbnail_url}" alt="" />
    <div class="video-card-body">
      <h3>${escapeHtml(video.title || "Untitled video")}</h3>
      <p>${date(video.published_at)} · ${compact(video.views)} ${t.views}</p>
      <div class="video-meta"><strong>${score(video).toFixed(2)}</strong><span>${compact(video.likes)} ${t.likes}</span></div>
      <a href="${video.video_url}" target="_blank" rel="noreferrer">${t.watch} ↗</a>
    </div>
  </article>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

function render(): void {
  const t = text[currentLocale];
  const demo: any = report();
  const dataset = demo.dataset;
  const profile = dataset.profile;
  const videos = dataset.videos;
  const groups = dataset.groups;
  const evidence = dataset.evidence;
  const top = groups.top_preview || groups.top?.slice(0, 10) || [];
  const bottom = groups.bottom_preview || groups.bottom?.slice(0, 10) || [];
  const recent = groups.recent?.slice(0, 5) || [];
  const insights = evidence.insights?.triggered || evidence.insights?.features || [];
  const model = evidence.predictive_model || {};
  const shap = model.shap || {};
  const shapVideos = Object.entries(shap.videos || {}) as [string, any][];
  if (!selectedVideoId && shapVideos.length) selectedVideoId = shapVideos[0][0];
  const selected = shapVideos.find(([id]) => id === selectedVideoId)?.[1];
  const selectedVideo = videos.find((video: any) => video.video_id === selectedVideoId);
  const causal = evidence.causal_model || {};
  const distribution = evidence.distribution_points || [];

  document.documentElement.lang = currentLocale;
  $("#app").innerHTML = `
    <header class="site-header">
      <a class="brand" href="#"><span class="brand-mark">S</span><span>SNAPIK</span></a>
      <div class="header-actions"><span class="static-pill">STATIC DEMO</span><button id="language" class="language-button">${t.language}</button></div>
    </header>
    <main>
      <img class="hero-banner" src="./assets/snapik-header.png" alt="SNAPIK creator intelligence" />
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">${t.eyebrow}</p>
          <h1>${t.title}</h1>
          <p class="hero-subtitle">${t.subtitle}</p>
          <div class="hero-actions"><a class="primary-button" href="#report">${t.explore} ↓</a><button id="print" class="secondary-button">${t.print}</button></div>
        </div>
        <div class="hero-orbit"><div class="orbit-ring"></div><div class="orbit-core"><span>PEAK</span><strong>MrBeast</strong></div><i></i><i></i><i></i></div>
      </section>
      <section id="report" class="profile-strip">
        <div><span class="label">${t.demo}</span><h2>${profile.display_name}</h2><a href="${profile.profile_url}" target="_blank" rel="noreferrer">@${profile.handle} ↗</a></div>
        <div class="profile-stat"><strong>${compact(profile.followers)}</strong><span>${t.subscribers}</span></div>
        <div class="profile-stat"><strong>${format(profile.total_videos)}</strong><span>${t.videos}</span></div>
        <div class="profile-stat"><strong>${format(evidence.analyzed_videos)}</strong><span>${t.analyzed}</span></div>
      </section>
      <section class="section">
        <div class="section-heading"><div><p class="eyebrow">01 / signal</p><h2>${t.pattern}</h2></div><span class="section-note">${profile.total_videos} ${t.videos}</span></div>
        <div class="insight-grid">${insights.slice(0, 3).map((item: any, index: number) => `<article class="insight-card"><span>0${index + 1}</span><p>${escapeHtml(typeof item === "string" ? item : item.text || item.label || "Observed performance pattern.")}</p></article>`).join("")}</div>
      </section>
      <section class="section">
        <div class="section-heading"><div><p class="eyebrow">02 / portfolio</p><h2>${t.top}</h2></div><span class="section-note">${t.selected}</span></div>
        <div class="video-grid">${top.map((video: any, index: number) => card(video, index + 1)).join("")}</div>
        <div class="section-heading subsection"><div><p class="eyebrow">02b / contrast</p><h2>${t.bottom}</h2></div></div>
        <div class="video-grid">${bottom.map((video: any, index: number) => card(video, index + 1)).join("")}</div>
      </section>
      <section class="section chart-section">
        <div class="section-heading"><div><p class="eyebrow">03 / distribution</p><h2>${t.distribution}</h2><p class="section-description">${t.distributionHelp}</p></div></div>
        <div class="distribution"><div class="axis-label">performance score</div>${distribution.slice(0, 140).map((point: any, index: number) => `<span class="dot ${point.selected ? point.tier === "top" ? "top-dot" : point.tier === "bottom" ? "bottom-dot" : "selected-dot" : ""}" style="left:${(index / Math.max(distribution.length - 1, 1)) * 100}%; bottom:${Math.min(90, Math.max(6, ((Number(point.perf_score) + 2) / 10) * 86))}%" title="${escapeHtml(point.title || "")}"></span>`).join("")}<div class="axis-line"></div></div>
      </section>
      <section class="section premium-section">
        <div class="section-heading"><div><p class="eyebrow">04 / model</p><h2>${t.predictive}</h2></div><span class="premium-tag">DEMO UNLOCKED</span></div>
        <div class="model-panel"><div class="model-score"><span>R²</span><strong>${Number(model.r2 ?? 0).toFixed(2)}</strong><small>${model.winner || "Random Forest"} · ${model.rows || videos.length} rows</small></div><div class="model-copy"><p>${t.shapHelp}</p><div class="metric-row"><span>MAE</span><strong>${Number(model.mae ?? 0).toFixed(3)}</strong><span>${t.baseline}</span><strong>${Number(model.baseline_mae ?? 0).toFixed(3)}</strong></div></div></div>
      </section>
      <section class="section premium-section">
        <div class="section-heading"><div><p class="eyebrow">05 / explain</p><h2>${t.shap}</h2><p class="section-description">${t.shapHelp}</p></div><span class="premium-tag">PREMIUM</span></div>
        ${shap.status === "ok" ? `<div class="shap-layout"><div class="shap-global"><h3>Global pattern</h3>${(shap.global_importance || []).slice(0, 8).map((item: any) => `<div class="bar-row"><span>${escapeHtml(item.feature)}</span><i><b style="width:${Math.min(100, Number(item.mean_abs_shap) * 100)}%"></b></i><em>${Number(item.mean_abs_shap).toFixed(2)}</em></div>`).join("")}</div><div class="shap-detail"><h3>${escapeHtml(selectedVideo?.title || "Video explanation")}</h3><p>${date(selectedVideo?.published_at)} · ${compact(selectedVideo?.views)} ${t.views}</p>${(selected?.shap_values || []).slice(0, 8).map((item: any) => `<div class="bar-row"><span>${escapeHtml(item.feature)}</span><i><b class="${Number(item.value) < 0 ? "negative" : ""}" style="width:${Math.min(100, Math.abs(Number(item.value)) * 42)}%"></b></i><em>${Number(item.value).toFixed(2)}</em></div>`).join("")}<div class="shap-controls">${shapVideos.map(([id], index) => `<button class="${id === selectedVideoId ? "active" : ""}" data-video="${id}">${index + 1}</button>`).join("")}</div></div></div>` : `<div class="empty-state">${t.modelUnavailable}</div>`}
      </section>
      <section class="section causal-section">
        <div class="section-heading"><div><p class="eyebrow">06 / caution</p><h2>${t.causal}</h2><p class="section-description">${t.causalHelp}</p></div><span class="premium-tag">PREMIUM</span></div>
        <div class="causal-copy">${causal.eligible_treatments?.length ? causal.eligible_treatments.slice(0, 4).map((item: any) => `<div class="causal-item"><strong>${escapeHtml(item.label || item.treatment || "Treatment")}</strong><span>${Number(item.effect ?? item.estimate ?? 0).toFixed(2)}</span></div>`).join("") : `<p>${t.noCausal}</p>`}</div>
      </section>
    </main>
    <footer><span>SNAPIK / find the peak</span><span>${t.demo} · ${profile.display_name}</span></footer>`;

  $("#language").addEventListener("click", () => { currentLocale = currentLocale === "pl" ? "en" : "pl"; void loadDemo(); });
  $("#print").addEventListener("click", () => window.print());
  document.querySelectorAll<HTMLButtonElement>("[data-video]").forEach((button) => button.addEventListener("click", () => { selectedVideoId = button.dataset.video || ""; render(); }));
}

async function loadDemo(): Promise<void> {
  $("#app").innerHTML = `<div class="loading-screen"><span class="brand-mark">S</span><p>Loading the cached peak…</p></div>`;
  const response = await fetch(currentLocale === "pl" ? "./data/demo-pl.json" : "./data/demo-en.json");
  if (!response.ok) throw new Error("Could not load the cached demo.");
  demoData = await response.json();
  render();
}

loadDemo().catch((error: unknown) => {
  $("#app").innerHTML = `<div class="loading-screen"><p>${error instanceof Error ? error.message : "Could not load the demo."}</p></div>`;
});
