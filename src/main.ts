import "./style.css";

type Locale = "en" | "pl";

const locale: Locale = navigator.language.toLowerCase().startsWith("pl") ? "pl" : "en";
let currentLocale = locale;
let selectedVideoId = "";
let selectedTreatmentId = "";
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

function quantile(values: number[], fraction: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function outcomeChart(treatment: any, rows: any[], videosById: Map<string, any>, locale: Locale): string {
  const t = text[locale];
  const outcomeKey = "age_normalized_cumulative_view_rate_log";
  const treated = rows.filter((row) => row[treatment.treatment] === true && typeof row[outcomeKey] === "number");
  const control = rows.filter((row) => row[treatment.treatment] === false && typeof row[outcomeKey] === "number");
  const all = [...treated, ...control].map((row) => row[outcomeKey]);
  if (!all.length) return "";
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(max - min, 0.001);
  const y = (value: number) => 184 - ((value - min) / span) * 140;
  const box = (rowsForGroup: any[], x: number, color: string, label: string) => {
    const values = rowsForGroup.map((row) => row[outcomeKey] as number);
    const q1 = quantile(values, .25);
    const med = quantile(values, .5);
    const q3 = quantile(values, .75);
    const points = rowsForGroup.map((row, index) => `<circle class="causal-dot" data-video-id="${escapeHtml(row.video_id || "")}" cx="${x + ((index * 37) % 34) - 17}" cy="${y(row[outcomeKey])}" r="3.5" fill="${color}" fill-opacity=".48"><title>${escapeHtml(row.title || row.video_id || "")} · ${label}: ${Number(row[outcomeKey]).toFixed(3)}</title></circle>`).join("");
    return `<line x1="${x}" y1="${y(Math.min(...values))}" x2="${x}" y2="${y(Math.max(...values))}" stroke="${color}" stroke-width="2"><title>${label}: range ${Math.min(...values).toFixed(3)}–${Math.max(...values).toFixed(3)}</title></line><rect class="causal-box" x="${x - 25}" y="${y(q3)}" width="50" height="${Math.max(2, y(q1) - y(q3))}" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width="2"><title>${label} middle 50%: Q1 ${q1.toFixed(3)} · median ${med.toFixed(3)} · Q3 ${q3.toFixed(3)}</title></rect><line x1="${x - 25}" y1="${y(med)}" x2="${x + 25}" y2="${y(med)}" stroke="${color}" stroke-width="3"><title>${label} median: ${med.toFixed(3)}</title></line>${points}<text x="${x}" y="210" text-anchor="middle" fill="#aab1ca">${label} (n=${values.length})</text>`;
  };
  const grid = [0, .25, .5, .75, 1].map((fraction) => {
    const value = min + span * fraction;
    return `<line x1="70" y1="${y(value)}" x2="720" y2="${y(value)}" stroke="#3b4569"/><text x="62" y="${y(value) + 4}" text-anchor="end" fill="#aab1ca" font-size="11">${value.toFixed(2)}</text>`;
  }).join("");
  const thumbs = (group: any[], label: string) => `<div><strong>${label}</strong><div class="thumb-strip">${group.slice(0, 5).map((row) => {
    const video = videosById.get(row.video_id);
    return video?.thumbnail_url ? `<a href="${escapeHtml(video.video_url)}" target="_blank" rel="noreferrer" title="${escapeHtml(video.title || "")}"><img src="${escapeHtml(video.thumbnail_url)}" alt="" loading="eager" /></a>` : "";
  }).join("")}</div></div>`;
  const interval = treatment.confidence_interval_95 || [];
  const label = currentLocale === "pl" ? treatment.treatment_label || treatment.treatment : treatment.treatment_label_en || treatment.treatment_label || treatment.treatment;
  const definitions: Record<string, string> = currentLocale === "pl" ? {
    duration_short: "filmy trwające nie dłużej niż 60 sekund",
    duration_long: "filmy trwające dłużej niż 180 sekund",
    has_call_to_action: "opis zawiera wezwanie do działania",
    has_giveaway_language: "tytuł lub opis zawiera język konkursu albo nagrody",
    title_number: "tytuł zawiera cyfrę",
    title_question: "tytuł zawiera znak zapytania",
    title_exclamation: "tytuł zawiera wykrzyknik",
    has_collaboration_language: "tytuł lub opis zawiera język współpracy",
  } : {};
  const definition = definitions[treatment.treatment] || treatment.treatment_definition || treatment.treatment_label || treatment.treatment;
  const lift = Number(treatment.estimated_lift_percent || 0);
  return `<details class="causal-explorer"><summary class="causal-summary"><span class="causal-summary-title">${escapeHtml(label)}</span><span class="causal-summary-stat">${lift.toFixed(1)}% LIFT</span><span class="causal-summary-stat">${treatment.treated_rows} treated</span><span class="causal-summary-stat">${treatment.control_rows} control</span></summary><div class="causal-highlight"><div><span class="causal-highlight-label">${currentLocale === "pl" ? "WYSZCZEGÓLNIENIE TREATMENTU" : "TREATMENT DEFINITION"}</span><strong>${escapeHtml(label)}</strong><p>${currentLocale === "pl" ? "To oznacza: " : "This means: "}${escapeHtml(definition)}.</p></div><div class="causal-lift ${lift < 0 ? "negative" : "positive"}"><span>LIFT</span><strong>${lift >= 0 ? "+" : ""}${lift.toFixed(1)}%</strong><small>${currentLocale === "pl" ? "zaobserwowana różnica" : "observed difference"}</small></div></div><div class="causal-stats"><span class="causal-stat">95%: [${Number(interval[0]).toFixed(3)}, ${Number(interval[1]).toFixed(3)}]</span></div><p class="causal-explanation">${escapeHtml(treatment.warning || "")}</p><div class="causal-thumbs">${thumbs(treated, currentLocale === "pl" ? "Grupa treatmentu" : "Treated")}${thumbs(control, currentLocale === "pl" ? "Grupa kontrolna" : "Control")}</div><svg viewBox="0 0 760 225" role="img" aria-label="Outcome distribution">${grid}<line x1="70" y1="184" x2="720" y2="184" stroke="#9aa5b8"/>${box(treated, 240, "#5b5ce2", currentLocale === "pl" ? "Treatment" : "Treated")}${box(control, 520, "#e6814f", currentLocale === "pl" ? "Kontrola" : "Control")}<text x="12" y="18" fill="#dbe2ff" font-size="11">log age-normalized view rate</text></svg></details>`;
}

function renderCausalPanel(causal: any, rows: any[], videosById: Map<string, any>): void {
  const target = document.querySelector<HTMLElement>("#causalInteractive");
  if (!target) return;
  const treatments = causal.eligible_treatments || [];
  if (!treatments.length) {
    target.innerHTML = `<p>${text[currentLocale].noCausal}</p>`;
    return;
  }
  target.innerHTML = `${treatments.map((treatment: any) => outcomeChart(treatment, rows, videosById, currentLocale)).join("")}<div id="causalTooltip" class="distribution-tooltip causal-tooltip" hidden></div><div id="causalVideoDetail" class="video-detail-card muted">Hover a point for details; click it to inspect the video.</div>`;
  const tooltip = target.querySelector<HTMLElement>("#causalTooltip");
  const detail = target.querySelector<HTMLElement>("#causalVideoDetail");
  target.querySelectorAll<SVGCircleElement>(".causal-dot").forEach((dot) => {
    const video = videosById.get(dot.dataset.videoId || "");
    dot.addEventListener("pointerenter", () => {
      if (!tooltip || !video) return;
      tooltip.innerHTML = `<strong>${escapeHtml(video.title || video.video_id)}</strong><br/>${date(video.published_at)} · ${format(video.views)} ${text[currentLocale].views}<br/>Outcome: ${dot.querySelector("title")?.textContent?.split("·").pop()?.trim() || "—"}`;
      tooltip.hidden = false;
      tooltip.style.display = "block";
    });
    dot.addEventListener("pointermove", (event) => {
      if (!tooltip) return;
      tooltip.style.position = "fixed";
      tooltip.style.left = `${Math.min(event.clientX + 12, window.innerWidth - tooltip.offsetWidth - 10)}px`;
      tooltip.style.top = `${Math.min(event.clientY + 12, window.innerHeight - tooltip.offsetHeight - 10)}px`;
    });
    dot.addEventListener("pointerleave", () => { if (tooltip) { tooltip.hidden = true; tooltip.style.display = "none"; } });
    dot.addEventListener("click", () => {
      if (!detail || !video) return;
      detail.style.display = "block";
      detail.classList.remove("muted");
      detail.innerHTML = `<a href="${escapeHtml(video.video_url || "#")}" target="_blank" rel="noreferrer">${video.thumbnail_url ? `<img src="${escapeHtml(video.thumbnail_url)}" alt="" />` : ""}<div><strong class="video-detail-title">${escapeHtml(video.title || video.video_id)}</strong><div class="video-detail-meta">${date(video.published_at)} · ${format(video.views)} ${text[currentLocale].views} · ${format(video.likes)} ${text[currentLocale].likes}</div></div></a>`;
    });
  });
  target.querySelectorAll<SVGRectElement>(".causal-box").forEach((box) => {
    box.addEventListener("pointerenter", () => {
      if (!tooltip) return;
      tooltip.textContent = box.querySelector("title")?.textContent || "";
      tooltip.hidden = false;
      tooltip.style.display = "block";
    });
    box.addEventListener("pointermove", (event) => {
      if (!tooltip) return;
      tooltip.style.position = "fixed";
      tooltip.style.left = `${Math.min(event.clientX + 12, window.innerWidth - tooltip.offsetWidth - 10)}px`;
      tooltip.style.top = `${Math.min(event.clientY + 12, window.innerHeight - tooltip.offsetHeight - 10)}px`;
    });
    box.addEventListener("pointerleave", () => { if (tooltip) { tooltip.hidden = true; tooltip.style.display = "none"; } });
  });
}

function renderShapPanel(shap: any, videos: any[], videosById: Map<string, any>): void {
  const target = document.querySelector<HTMLElement>("#shapInteractive");
  if (!target) return;
  if (!shap || shap.status !== "ok") {
    target.innerHTML = `<div class="empty-state">${text[currentLocale].modelUnavailable}</div>`;
    return;
  }
  const videoIds = Object.keys(shap.videos || {});
  const selected = shap.videos[selectedVideoId] || shap.videos[videoIds[0]];
  selectedVideoId ||= videoIds[0];
  const selectedVideo = videosById.get(selectedVideoId);
  const features = (selected?.shap_values || []).slice(0, 14);
  const maxValue = Math.max(...features.map((item: any) => Math.abs(item.value)), .001);
  const baseX = 500;
  const formatShapValue = (value: any) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "yes" : "no";
    if (typeof value === "number") return Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(3);
    return String(value).slice(0, 18);
  };
  const shortFeature = (value: string) => value.replaceAll("_", " ").slice(0, 25);
  const waterfall = features.map((item: any, index: number) => {
    const y = 24 + index * 30;
    const width = Math.abs(item.value) / maxValue * 130;
    const x = item.value >= 0 ? baseX : baseX - width;
    const color = item.value >= 0 ? "#22d3ee" : "#fb4fbd";
    const featureValue = formatShapValue(item.feature_value);
    return `<text x="8" y="${y + 12}" fill="#dbe2ff" font-size="12">${escapeHtml(shortFeature(item.feature))}</text><text x="270" y="${y + 12}" fill="#aab1ca" font-size="11">${escapeHtml(featureValue)}</text><rect x="${x}" y="${y}" width="${width}" height="16" rx="6" fill="${color}"><title>${escapeHtml(item.feature)}: ${escapeHtml(featureValue)}; SHAP ${item.value.toFixed(3)}</title></rect><text x="${item.value >= 0 ? x + width + 7 : x - 7}" y="${y + 12}" text-anchor="${item.value >= 0 ? "start" : "end"}" fill="#fff" font-size="12">${item.value >= 0 ? "+" : ""}${item.value.toFixed(3)}</text>`;
  }).join("");
  const global = (shap.global_importance || []).slice(0, 14);
  const allValues = Object.values(shap.videos).flatMap((video: any) => video.shap_values || []);
  const range = Math.max(...allValues.map((item: any) => Math.abs(item.value)), .001);
  const rowsSvg = global.map((item: any, index: number) => {
    const y = 25 + index * 25;
    const dots = Object.entries(shap.videos).map(([videoId, video]: [string, any]) => {
      const found = (video.shap_values || []).find((value: any) => value.feature === item.feature);
      if (!found) return "";
      const x = 430 + (found.value / range) * 260;
      const title = videosById.get(videoId)?.title || videoId;
      return `<circle class="shap-dot" data-video-id="${videoId}" data-feature="${escapeHtml(item.feature)}" cx="${x}" cy="${y + ((Math.abs(found.value * 997) % 11) - 5)}" r="4.5" fill="${found.value >= 0 ? "#22d3ee" : "#fb4fbd"}" style="pointer-events:all"><title>${escapeHtml(title)} — ${escapeHtml(item.feature)}: ${found.value.toFixed(4)}</title></circle>`;
    }).join("");
    return `<text x="8" y="${y + 4}" fill="#dbe2ff" font-size="11">${escapeHtml(item.feature)}</text>${dots}`;
  }).join("");
  const index = videoIds.indexOf(selectedVideoId);
  target.innerHTML = `<div class="shap-layout"><div class="shap-global"><h3>Global SHAP pattern</h3><div class="shap-chart"><svg viewBox="0 0 760 ${global.length * 25 + 35}"><line x1="430" y1="8" x2="430" y2="${global.length * 25 + 15}" stroke="#8994b5" stroke-dasharray="3 3"/>${rowsSvg}</svg></div><div id="shapGlobalTooltip" class="distribution-tooltip shap-global-tooltip" hidden></div></div><div class="shap-detail"><div class="shap-video-preview"><a href="${escapeHtml(selectedVideo?.video_url || "#")}" target="_blank" rel="noreferrer">${selectedVideo?.thumbnail_url ? `<img src="${escapeHtml(selectedVideo.thumbnail_url)}" alt="" />` : ""}<span><strong>${escapeHtml(selectedVideo?.title || selectedVideoId)}</strong><small>${date(selectedVideo?.published_at)} · ${compact(selectedVideo?.views)} ${text[currentLocale].views}</small></span></a></div><p class="muted">Base: ${Number(shap.base_value).toFixed(3)} → Prediction: ${Number(selected.prediction).toFixed(3)} · ${index + 1} / ${videoIds.length}</p><div class="shap-controls shap-navigation"><button data-shap="${videoIds[Math.max(0, index - 1)]}">← Previous</button><button data-shap="${videoIds[Math.min(videoIds.length - 1, index + 1)]}">Next →</button></div><input id="shapSlider" class="shap-slider" type="range" min="0" max="${Math.max(0, videoIds.length - 1)}" value="${index}" step="1" aria-label="Browse SHAP videos" /><div class="shap-chart"><svg viewBox="0 0 650 ${features.length * 30 + 35}"><line x1="${baseX}" y1="10" x2="${baseX}" y2="${features.length * 30 + 20}" stroke="#8994b5" stroke-dasharray="3 3"/>${waterfall}</svg></div></div></div>`;
  target.querySelector<HTMLInputElement>("#shapSlider")?.addEventListener("input", (event) => {
    selectedVideoId = videoIds[Number((event.target as HTMLInputElement).value)] || selectedVideoId;
    renderShapPanel(shap, videos, videosById);
  });
  const globalTooltip = target.querySelector<HTMLElement>("#shapGlobalTooltip");
  target.querySelectorAll<SVGCircleElement>(".shap-dot").forEach((dot) => {
    dot.addEventListener("pointerenter", () => {
      const videoId = dot.dataset.videoId || "";
      const video = shap.videos[videoId];
      const item = (video?.shap_values || []).find((value: any) => value.feature === dot.dataset.feature);
      if (!globalTooltip || !item) return;
      globalTooltip.innerHTML = `<strong>${escapeHtml(videosById.get(videoId)?.title || videoId)}</strong><br/>${escapeHtml(item.feature)} · SHAP: ${Number(item.value).toFixed(3)}<br/>${escapeHtml(`feature value: ${formatShapValue(item.feature_value)}`)}`;
      globalTooltip.hidden = false;
      globalTooltip.style.display = "block";
    });
    dot.addEventListener("pointermove", (event) => {
      if (!globalTooltip) return;
      globalTooltip.style.position = "fixed";
      globalTooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - globalTooltip.offsetWidth - 10)}px`;
      globalTooltip.style.top = `${Math.min(event.clientY + 14, window.innerHeight - globalTooltip.offsetHeight - 10)}px`;
    });
    dot.addEventListener("pointerleave", () => { if (globalTooltip) { globalTooltip.hidden = true; globalTooltip.style.display = "none"; } });
    dot.addEventListener("click", () => { selectedVideoId = dot.dataset.videoId || selectedVideoId; renderShapPanel(shap, videos, videosById); });
  });
  target.querySelectorAll<HTMLButtonElement>("[data-shap]").forEach((button) => button.addEventListener("click", () => { selectedVideoId = button.dataset.shap || selectedVideoId; renderShapPanel(shap, videos, videosById); }));
}

function renderDistribution(points: any[]): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#distributionCanvas");
  const chart = document.querySelector<HTMLElement>(".distribution-chart");
  const tooltip = document.querySelector<HTMLElement>("#distributionTooltip");
  const detail = document.querySelector<HTMLElement>("#distributionDetail");
  if (!canvas || !chart || !tooltip || !detail) return;
  const context = canvas.getContext("2d");
  if (!context) return;
  const dated = points.filter((point) => point.published_at && point.perf_score != null);
  const times = dated.map((point) => new Date(point.published_at).getTime());
  const scores = dated.map((point) => Number(point.perf_score));
  if (!dated.length) return;
  const minTime = Math.min(...times), maxTime = Math.max(...times), minScore = Math.min(...scores), maxScore = Math.max(...scores);
  const ranked = [...dated].sort((a, b) => Number(a.perf_score) - Number(b.perf_score));
  const weakIds = new Set(ranked.slice(0, Math.max(1, Math.ceil(ranked.length * .1))).map((point) => point.video_id));
  const topIds = new Set(ranked.slice(-Math.max(1, Math.ceil(ranked.length * .1))).map((point) => point.video_id));
  const left = 58, right = 18, top = 18, bottom = 42, width = canvas.width - left - right, height = canvas.height - top - bottom;
  const pointLayout: any[] = [];
  const x = (time: number) => left + ((time - minTime) / Math.max(1, maxTime - minTime)) * width;
  const y = (scoreValue: number) => Math.min(top + height - 7, Math.max(top + 7, top + height - ((scoreValue - minScore) / Math.max(.001, maxScore - minScore)) * height));
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "#3b4569"; context.fillStyle = "#aab1ca"; context.font = "12px sans-serif";
  for (let index = 0; index <= 4; index += 1) {
    const gy = top + height * index / 4;
    context.beginPath(); context.moveTo(left, gy); context.lineTo(left + width, gy); context.stroke();
    context.fillText((maxScore - (maxScore - minScore) * index / 4).toFixed(2), 4, gy + 4);
  }
  context.textAlign = "center";
  for (let index = 0; index < 6; index += 1) {
    const fraction = index / 5;
    context.fillText(new Date(minTime + (maxTime - minTime) * fraction).toLocaleDateString(currentLocale, { year: "numeric", month: "short" }), left + width * fraction, canvas.height - 14);
  }
  context.textAlign = "left";
  const drawOrder = [...dated].sort((a, b) => {
    const priority = (point: any) => point.selected && topIds.has(point.video_id) ? 3 : point.selected && weakIds.has(point.video_id) ? 2 : point.selected ? 1 : 0;
    return priority(a) - priority(b);
  });
  for (const point of drawOrder) {
    const px = x(new Date(point.published_at).getTime()), py = y(Number(point.perf_score));
    context.fillStyle = point.selected && topIds.has(point.video_id) ? "#22c55e" : point.selected && weakIds.has(point.video_id) ? "#a855f7" : point.selected ? "#f59e0b" : "#77809a";
    const isWeak = weakIds.has(point.video_id);
    context.beginPath(); context.arc(px, py, point.selected && (topIds.has(point.video_id) || isWeak) ? 4.5 : point.selected ? 3.5 : 2.2, 0, Math.PI * 2); context.fill();
    if (point.selected && (isWeak || topIds.has(point.video_id))) {
      context.strokeStyle = "#e9d5ff";
      context.lineWidth = 1;
      context.stroke();
    }
    pointLayout.push({ point, x: px, y: py });
  }
  const nearest = (event: MouseEvent) => {
    const bounds = canvas.getBoundingClientRect(), scaleX = canvas.width / bounds.width, scaleY = canvas.height / bounds.height;
    const px = (event.clientX - bounds.left) * scaleX, py = (event.clientY - bounds.top) * scaleY;
    return pointLayout.reduce((best, item) => { const distance = Math.hypot(item.x - px, item.y - py); return !best || distance < best.distance ? { ...item, distance } : best; }, null as any);
  };
  canvas.onmousemove = (event) => {
    const hit = nearest(event);
    if (!hit || hit.distance > 12) { tooltip.hidden = true; return; }
    tooltip.innerHTML = `<strong>${escapeHtml(hit.point.title || hit.point.video_id)}</strong><br/>${date(hit.point.published_at)} · ${Number(hit.point.perf_score).toFixed(3)} · ${hit.point.selected ? text[currentLocale].selected : "Observed"}`;
    tooltip.hidden = false;
    const chartBounds = chart.getBoundingClientRect(), canvasBounds = canvas.getBoundingClientRect();
    tooltip.style.left = `${Math.max(8, Math.min(canvasBounds.left + hit.x * canvasBounds.width / canvas.width - chartBounds.left + 10, chart.clientWidth - tooltip.offsetWidth - 8))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(canvasBounds.top + hit.y * canvasBounds.height / canvas.height - chartBounds.top + 10, chart.clientHeight - tooltip.offsetHeight - 8))}px`;
  };
  canvas.onmouseleave = () => { tooltip.hidden = true; };
  canvas.onclick = (event) => {
    const hit = nearest(event);
    if (!hit || hit.distance > 12) return;
    detail.style.display = "block"; detail.classList.remove("muted");
    detail.innerHTML = `<a href="${escapeHtml(hit.point.video_url || "#")}" target="_blank" rel="noreferrer">${hit.point.thumbnail_url ? `<img src="${escapeHtml(hit.point.thumbnail_url)}" alt="" />` : ""}<div><strong class="video-detail-title">${escapeHtml(hit.point.title || hit.point.video_id)}</strong><div class="video-detail-meta">${date(hit.point.published_at)} · ${format(hit.point.views)} ${text[currentLocale].views} · ${Number(hit.point.perf_score).toFixed(3)}</div></div></a>`;
  };
}

function render(): void {
  const t = text[currentLocale];
  const demo: any = report();
  const dataset = demo.dataset;
  const profile = dataset.profile;
  const videos = dataset.videos;
  const groups = dataset.groups;
  const evidence = dataset.evidence;
  const videosById = new Map<string, any>(videos.map((video: any) => [video.video_id, video]));
  const featuresById = new Map((dataset.feature_rows || []).map((row: any) => [row.video_id, row]));
  const resolveVideos = (items: any[] = []) => items.map((item) => {
    const video = typeof item === "string" ? videosById.get(item) : item;
    const feature: any = video ? featuresById.get(video.video_id) : undefined;
    return video ? { ...video, perf_score: feature?.perf_score ?? video.perf_score } : null;
  }).filter(Boolean);
  const top = resolveVideos(groups.top_preview || groups.top?.slice(0, 10));
  const bottom = resolveVideos(groups.bottom_preview || groups.bottom?.slice(0, 10));
  const recent = resolveVideos(groups.recent?.slice(0, 5));
  const insights = evidence.insights?.triggered || evidence.insights?.features || [];
  const model = evidence.predictive_model || {};
  const shap = model.shap || {};
  const shapVideos = Object.entries(shap.videos || {}) as [string, any][];
  if (!selectedVideoId && shapVideos.length) selectedVideoId = shapVideos[0][0];
  const selected = shapVideos.find(([id]) => id === selectedVideoId)?.[1];
  const selectedVideo = videos.find((video: any) => video.video_id === selectedVideoId);
  const causal = evidence.causal_model || {};
  const distribution = evidence.distribution_points || [];
  const eligibleTreatments = causal.eligible_treatments || [];
  if (!selectedTreatmentId && eligibleTreatments.length) selectedTreatmentId = eligibleTreatments[0].treatment;
  const selectedTreatment = eligibleTreatments.find((item: any) => item.treatment === selectedTreatmentId) || eligibleTreatments[0];
  const shapIndex = Math.max(0, shapVideos.findIndex(([id]) => id === selectedVideoId));
  const previousShapId = shapVideos[(shapIndex - 1 + shapVideos.length) % Math.max(shapVideos.length, 1)]?.[0];
  const nextShapId = shapVideos[(shapIndex + 1) % Math.max(shapVideos.length, 1)]?.[0];

  document.documentElement.lang = currentLocale;
  $("#app").innerHTML = `
    <header class="site-header">
      <a class="brand" href="#"><img class="brand-icon" src="./assets/snapik-icon.png" alt="" /><span>SNAPIK</span></a>
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
        <div class="distribution-legend"><span><i class="legend-dot top"></i>${currentLocale === "pl" ? "Najlepsze 10%" : "Top 10%"}</span><span><i class="legend-dot weak"></i>${currentLocale === "pl" ? "Najsłabsze 10%" : "Weakest 10%"}</span><span><i class="legend-dot other"></i>${currentLocale === "pl" ? "Pozostałe wybrane" : "Other selected"}</span><span><i class="legend-dot observed"></i>${currentLocale === "pl" ? "Nie wybrane" : "Not selected"}</span></div><div class="distribution distribution-chart"><canvas id="distributionCanvas" width="1000" height="360"></canvas><div id="distributionTooltip" class="distribution-tooltip" hidden></div></div>
        <div id="distributionDetail" class="video-detail-card muted">Click a point to inspect that video.</div>
      </section>
      <section class="section premium-section">
        <div class="section-heading"><div><p class="eyebrow">04 / model</p><h2>${t.predictive}</h2></div><span class="premium-tag">DEMO UNLOCKED</span></div>
        <div class="model-panel"><div class="model-score"><span>R²</span><strong>${Number(model.r2 ?? 0).toFixed(2)}</strong><small>${model.winner || "Random Forest"} · ${model.rows || videos.length} rows</small></div><div class="model-copy"><p>${t.shapHelp}</p><div class="metric-row"><span>MAE</span><strong>${Number(model.mae ?? 0).toFixed(3)}</strong><span>${t.baseline}</span><strong>${Number(model.baseline_mae ?? 0).toFixed(3)}</strong></div></div></div>
      </section>
      <section class="section premium-section">
        <div class="section-heading"><div><p class="eyebrow">05 / explain</p><h2>${t.shap}</h2><p class="section-description">${t.shapHelp}</p></div><span class="premium-tag">PREMIUM</span></div>
        <div id="shapInteractive"></div>
      </section>
      <section class="section causal-section">
        <div class="section-heading"><div><p class="eyebrow">06 / caution</p><h2>${t.causal}</h2><p class="section-description">${t.causalHelp}</p></div><span class="premium-tag">PREMIUM</span></div>
        <div id="causalInteractive" class="causal-copy"></div>
      </section>
    </main>
    <footer><span>SNAPIK / find the peak</span><span>${t.demo} · ${profile.display_name}</span></footer>`;

  renderShapPanel(shap, videos, videosById);
  renderCausalPanel(causal, dataset.feature_rows || [], videosById);
  renderDistribution(distribution);
  $("#language").addEventListener("click", () => { currentLocale = currentLocale === "pl" ? "en" : "pl"; void loadDemo(); });
  $("#print").addEventListener("click", () => window.print());
  document.querySelectorAll<HTMLButtonElement>("[data-video]").forEach((button) => button.addEventListener("click", () => { selectedVideoId = button.dataset.video || ""; render(); }));
  document.querySelectorAll<HTMLButtonElement>("[data-shap]").forEach((button) => button.addEventListener("click", () => { selectedVideoId = button.dataset.shap || selectedVideoId; render(); }));
  document.querySelectorAll<HTMLButtonElement>("[data-treatment]").forEach((button) => button.addEventListener("click", () => { selectedTreatmentId = button.dataset.treatment || selectedTreatmentId; render(); }));
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
