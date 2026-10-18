(function () {
  const data = window.WATER_TREATMENT_DATA;
  if (!data || !data.steps) return;

  let currentStepIndex = 0;
  let currentStageMode = "main"; // 'main' | 'detail' | 'split'
  let splitRatio = 50; // 0 to 100
  let isDraggingSplit = false;
  let currentDisplayMode = "scrolly"; // 'scrolly' | 'grid'
  let activeModalStepIndex = 0;

  // DOM Elements
  const progressBarEl = document.getElementById("stepProgressBar");
  const narrativeColEl = document.getElementById("narrativeColumn");
  const timelineGridEl = document.getElementById("timelineGrid");
  const advGridEl = document.getElementById("advUnitsGrid");
  const pipeListEl = document.getElementById("pipeFlowList");

  // Sticky Stage DOM
  const stageMainImg = document.getElementById("stageMainImg");
  const stageDetailClip = document.getElementById("stageDetailClip");
  const stageDetailImg = document.getElementById("stageDetailImg");
  const compareDivider = document.getElementById("compareDivider");
  const photoViewport = document.getElementById("photoViewport");
  const hotspotLayer = document.getElementById("hotspotLayer");
  const stageStepTag = document.getElementById("stageStepTag");
  const stageStepName = document.getElementById("stageStepName");
  const stageCaptionText = document.getElementById("stageCaptionText");
  const stageWaterSwatch = document.getElementById("stageWaterSwatch");
  const stageWaterLabel = document.getElementById("stageWaterLabel");

  // HUD DOM
  const hudTurbidity = document.getElementById("hudTurbidity");
  const hudChlorine = document.getElementById("hudChlorine");
  const hudZeta = document.getElementById("hudZeta");
  const hudHrt = document.getElementById("hudHrt");

  // Mode Switch Buttons
  const modeScrollyBtn = document.getElementById("modeScrollyBtn");
  const modeGridBtn = document.getElementById("modeGridBtn");
  const scrollyContainer = document.getElementById("scrollyContainer");
  const gridViewContainer = document.getElementById("gridViewContainer");

  // Stage Photo View Buttons
  const viewMainBtn = document.getElementById("viewMainBtn");
  const viewDetailBtn = document.getElementById("viewDetailBtn");
  const viewSplitBtn = document.getElementById("viewSplitBtn");
  const stageOpenModalBtn = document.getElementById("stageOpenModalBtn");

  // Modal DOM
  const lightboxBackdrop = document.getElementById("lightboxBackdrop");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const modalMainImg = document.getElementById("modalMainImg");
  const modalPhotoCaption = document.getElementById("modalPhotoCaption");
  const modalThumbMain = document.getElementById("modalThumbMain");
  const modalThumbDetail = document.getElementById("modalThumbDetail");
  const modalThumbMainImg = document.getElementById("modalThumbMainImg");
  const modalThumbDetailImg = document.getElementById("modalThumbDetailImg");
  const modalStepBadge = document.getElementById("modalStepBadge");
  const modalTitle = document.getElementById("modalTitle");
  const modalEngTitle = document.getElementById("modalEngTitle");
  const modalLaymanPane = document.getElementById("modalLaymanPane");
  const modalSpecsPane = document.getElementById("modalSpecsPane");
  const modalFieldPane = document.getElementById("modalFieldPane");
  const modalPrevBtn = document.getElementById("modalPrevBtn");
  const modalNextBtn = document.getElementById("modalNextBtn");

  // Format markdown-like bold text (**text**)
  function formatRichText(str) {
    return str.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  }

  // 1. Initialize Top Navigation Pills
  function renderNavPills() {
    progressBarEl.innerHTML = data.steps
      .map(
        (s, idx) => `
      <button class="step-pill ${idx === 0 ? "active" : ""}" data-index="${idx}">
        <span class="num">${s.stepNumber}</span>
        <span>${s.title.split("—")[0].trim()}</span>
      </button>
    `
      )
      .join("");

    progressBarEl.querySelectorAll(".step-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        if (currentDisplayMode === "scrolly") {
          const targetCard = document.getElementById(`narrative-card-${idx}`);
          if (targetCard) {
            targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          updateActiveStep(idx);
        } else {
          openLightbox(idx, "main");
        }
      });
    });
  }

  // 2. Render Scrollytelling Narrative Cards (Right Column)
  function renderNarrativeCards() {
    narrativeColEl.innerHTML = data.steps
      .map(
        (s, idx) => `
      <article class="step-narrative-card ${idx === 0 ? "active-step" : ""}" id="narrative-card-${idx}" data-index="${idx}">
        <div class="card-header-meta">
          <span class="step-num-badge">STEP ${s.stepNumber}</span>
          <span class="step-phase-tag">${s.phase}</span>
        </div>
        <h2 class="card-title">${s.title}</h2>
        <div class="card-eng-title">${s.engTitle}</div>
        <div class="card-tagline">💡 ${s.tagline}</div>
        <p class="card-summary">${s.summary}</p>

        <div class="card-photo-strip">
          <div class="mini-thumb" data-action="preview" data-index="${idx}" data-view="main">
            <img src="${s.mainImage}" alt="${s.title} 主視覺" loading="lazy" />
            <span>📷 運轉實景圖</span>
          </div>
          <div class="mini-thumb" data-action="preview" data-index="${idx}" data-view="detail">
            <img src="${s.detailImage}" alt="${s.title} 構造與特寫" loading="lazy" />
            <span>🔬 內部構造 / 特寫</span>
          </div>
        </div>

        <div class="card-field-callout">
          <strong>👷 ${s.fieldNotes.title}</strong>
          <span>${s.fieldNotes.content.slice(0, 92)}...</span>
        </div>

        <button class="open-lightbox-btn" data-open-modal="${idx}">
          <span>🔍 點擊展開：現場實景相簿、白話原理與工程規格</span>
        </button>
      </article>
    `
      )
      .join("");

    // Bind thumbnail clicks inside cards
    narrativeColEl.querySelectorAll(".mini-thumb").forEach((thumb) => {
      thumb.addEventListener("click", () => {
        const idx = parseInt(thumb.getAttribute("data-index"), 10);
        const view = thumb.getAttribute("data-view");
        updateActiveStep(idx);
        setStageViewMode(view);
      });
    });

    // Bind modal open buttons
    narrativeColEl.querySelectorAll("[data-open-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-open-modal"), 10);
        openLightbox(idx, "main");
      });
    });
  }

  // 3. Render Timeline Grid Cards (Mode 2)
  function renderTimelineGrid() {
    timelineGridEl.innerHTML = data.steps
      .map(
        (s, idx) => `
      <div class="grid-step-card" data-grid-index="${idx}">
        <div class="grid-card-img-wrap">
          <img src="${s.mainImage}" alt="${s.title}" loading="lazy" />
          <div style="position:absolute;top:12px;left:12px;background:rgba(7,11,18,0.85);padding:4px 10px;border-radius:6px;border:1px solid rgba(56,189,248,0.4);font-family:monospace;font-weight:800;color:#38bdf8;font-size:0.8rem;">
            STEP ${s.stepNumber} · ${s.phase}
          </div>
        </div>
        <div class="grid-card-body">
          <div>
            <h3 style="font-size:1.2rem;font-weight:800;color:#fff;margin-bottom:0.35rem;">${s.title}</h3>
            <p style="font-size:0.82rem;color:#fde68a;margin-bottom:0.65rem;font-weight:600;">${s.tagline}</p>
            <p style="font-size:0.87rem;color:#cbd5e1;margin-bottom:1.1rem;">${s.summary.slice(0, 88)}...</p>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;font-size:0.76rem;color:#94a3b8;padding:0.55rem 0;border-top:1px solid rgba(148,163,184,0.15);margin-bottom:0.65rem;">
              <span>濁度：${s.metrics.turbidity.split("(")[0]}</span>
              <span>餘氯：${s.metrics.chlorine.split("(")[0]}</span>
            </div>
            <button class="open-lightbox-btn" style="padding:0.6rem;">🔍 查看雙角度照片與完整解說</button>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    timelineGridEl.querySelectorAll(".grid-step-card").forEach((card) => {
      card.addEventListener("click", () => {
        const idx = parseInt(card.getAttribute("data-grid-index"), 10);
        openLightbox(idx, "main");
      });
    });
  }

  // 4. Render Advanced Module & User Pipe Journey
  function renderExtraSections() {
    if (advGridEl && data.advancedModule) {
      advGridEl.innerHTML = data.advancedModule.units
        .map(
          (u) => `
        <div class="adv-unit-card">
          <div class="adv-code">${u.code}</div>
          <div class="adv-title">${u.name}</div>
          <div class="adv-role">⚡ ${u.role}</div>
          <p style="font-size:0.88rem;color:#cbd5e1;">${u.desc}</p>
        </div>
      `
        )
        .join("");
    }

    if (pipeListEl && data.userPipeJourney) {
      pipeListEl.innerHTML = data.userPipeJourney
        .map(
          (p, i) => `
        <div class="pipe-node">
          <div style="font-size:0.72rem;font-family:monospace;color:#94a3b8;margin-bottom:0.2rem;">STAGE 0${i + 1}</div>
          <h4>${p.stage}</h4>
          <div class="pipe-meta">💧 水壓狀態：<strong>${p.pressure}</strong></div>
          <div class="pipe-meta">🛡️ 自由餘氯：<strong>${p.chlorine}</strong></div>
          <div class="pipe-risk">⚠️ 風險關鍵：${p.risk}</div>
        </div>
      `
        )
        .join("");
    }
  }

  // 5. Update Sticky Stage when Active Step Changes
  function updateActiveStep(idx) {
    if (idx < 0 || idx >= data.steps.length) return;
    currentStepIndex = idx;
    const step = data.steps[idx];

    // Highlight Nav Pill
    progressBarEl.querySelectorAll(".step-pill").forEach((pill, i) => {
      pill.classList.toggle("active", i === idx);
    });

    // Highlight Narrative Card
    narrativeColEl.querySelectorAll(".step-narrative-card").forEach((card, i) => {
      card.classList.toggle("active-step", i === idx);
    });

    // Update Stage Header & Images
    stageStepTag.textContent = `STEP ${step.stepNumber} · ${step.phase}`;
    stageStepName.textContent = step.title;

    stageMainImg.src = step.mainImage;
    stageMainImg.alt = step.title;
    stageDetailImg.src = step.detailImage;
    stageDetailImg.alt = `${step.title} 細部構造`;

    updateCaptionByMode();

    // Update Water Swatch & Label
    stageWaterSwatch.style.background = step.waterColor;
    stageWaterLabel.textContent = step.waterColorLabel;

    // Update Telemetry HUD
    hudTurbidity.textContent = step.metrics.turbidity;
    hudChlorine.textContent = step.metrics.chlorine;
    hudZeta.textContent = step.metrics.zeta;
    hudHrt.textContent = step.metrics.hrt;

    // Render Hotspots
    renderHotspots(step.hotspots || []);
  }

  function updateCaptionByMode() {
    const step = data.steps[currentStepIndex];
    if (currentStageMode === "main") {
      stageCaptionText.textContent = `📷 現場運轉實景：${step.mainCaption}`;
    } else if (currentStageMode === "detail") {
      stageCaptionText.textContent = `🔬 內部構造 / 水質特寫：${step.detailCaption}`;
    } else {
      stageCaptionText.textContent = `↔️ 拖曳滑桿對比：左側為「運轉實景」，右側為「排空構造 / 水質特寫」`;
    }
  }

  function renderHotspots(hotspots) {
    hotspotLayer.innerHTML = hotspots
      .map(
        (h, i) => `
      <div class="hotspot-pin" style="left:${h.x}%; top:${h.y}%;" data-hotspot="${i}">
        +
        <div class="hotspot-tooltip">
          <strong>${h.title}</strong>
          <span>${h.desc}</span>
        </div>
      </div>
    `
      )
      .join("");

    hotspotLayer.querySelectorAll(".hotspot-pin").forEach((pin) => {
      pin.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasActive = pin.classList.contains("active");
        hotspotLayer.querySelectorAll(".hotspot-pin").forEach((p) => p.classList.remove("active"));
        if (!wasActive) pin.classList.add("active");
      });
    });
  }

  // Stage View Mode Switching ('main' | 'detail' | 'split')
  function setStageViewMode(mode) {
    currentStageMode = mode;
    viewMainBtn.classList.toggle("active", mode === "main");
    viewDetailBtn.classList.toggle("active", mode === "detail");
    viewSplitBtn.classList.toggle("active", mode === "split");

    if (mode === "main") {
      stageDetailClip.classList.remove("visible");
      compareDivider.classList.remove("active");
      hotspotLayer.style.display = "block";
    } else if (mode === "detail") {
      stageDetailClip.classList.add("visible");
      stageDetailClip.style.clipPath = "inset(0 0 0 0)";
      compareDivider.classList.remove("active");
      hotspotLayer.style.display = "none";
    } else if (mode === "split") {
      stageDetailClip.classList.add("visible");
      compareDivider.classList.add("active");
      hotspotLayer.style.display = "none";
      updateSplitPosition(splitRatio);
    }
    updateCaptionByMode();
  }

  function updateSplitPosition(percent) {
    splitRatio = Math.max(5, Math.min(95, percent));
    stageDetailClip.style.clipPath = `inset(0 0 0 ${splitRatio}%)`;
    compareDivider.style.left = `${splitRatio}%`;
  }

  // Split Slider Drag Events
  function initSplitSliderEvents() {
    const moveHandler = (clientX) => {
      if (!isDraggingSplit || currentStageMode !== "split") return;
      const rect = photoViewport.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      updateSplitPosition(pct);
    };

    compareDivider.addEventListener("mousedown", () => {
      isDraggingSplit = true;
    });
    window.addEventListener("mouseup", () => {
      isDraggingSplit = false;
    });
    window.addEventListener("mousemove", (e) => moveHandler(e.clientX));

    compareDivider.addEventListener(
      "touchstart",
      () => {
        isDraggingSplit = true;
      },
      { passive: true }
    );
    window.addEventListener("touchend", () => {
      isDraggingSplit = false;
    });
    window.addEventListener(
      "touchmove",
      (e) => {
        if (e.touches && e.touches[0]) moveHandler(e.touches[0].clientX);
      },
      { passive: true }
    );
  }

  // IntersectionObserver for Scrollytelling
  function initScrollObserver() {
    const cards = document.querySelectorAll(".step-narrative-card");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.getAttribute("data-index"), 10);
            if (!isNaN(idx) && idx !== currentStepIndex) {
              updateActiveStep(idx);
            }
          }
        });
      },
      {
        root: null,
        rootMargin: "-32% 0px -42% 0px",
        threshold: 0.1
      }
    );

    cards.forEach((c) => observer.observe(c));
  }

  // 6. Deep Lightbox Modal Logic (方案四)
  function openLightbox(idx, initialPhotoType = "main") {
    activeModalStepIndex = idx;
    const step = data.steps[idx];

    modalStepBadge.textContent = `STEP ${step.stepNumber} · ${step.phase}`;
    modalTitle.textContent = step.title;
    modalEngTitle.textContent = step.engTitle;

    modalThumbMainImg.src = step.mainImage;
    modalThumbDetailImg.src = step.detailImage;

    setModalPhoto(initialPhotoType);

    // Populate Tab 1: Layman Explanation
    modalLaymanPane.innerHTML =
      step.laymanExplanation
        .map((p) => `<div class="layman-p">${formatRichText(p)}</div>`)
        .join("") +
      `<div style="background:rgba(2,132,199,0.12);border:1px solid rgba(56,189,248,0.3);padding:1rem;border-radius:10px;font-size:0.88rem;color:#bae6fd;">
        <strong>💧 本階段水質狀態摘要：</strong><br/>
        • 濁度變化：${step.metrics.turbidity}<br/>
        • 自由有效餘氯：${step.metrics.chlorine}<br/>
        • 水力停留時間 (HRT)：${step.metrics.hrt}
      </div>`;

    // Populate Tab 2: Engineering Specs
    modalSpecsPane.innerHTML = `
      <table class="specs-table">
        <tbody>
          ${step.engineeringSpecs
            .map(
              (sp) => `
            <tr>
              <td>${sp.label}</td>
              <td>${sp.value}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `;

    // Populate Tab 3: Field Notes
    modalFieldPane.innerHTML = `
      <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.35);border-radius:12px;padding:1.25rem;">
        <h4 style="color:#fbbf24;font-size:1.05rem;margin-bottom:0.65rem;">👷 ${step.fieldNotes.title}</h4>
        <p style="font-size:0.94rem;color:#f1f5f9;line-height:1.75;">${step.fieldNotes.content}</p>
      </div>
    `;

    // Prev / Next buttons state
    modalPrevBtn.disabled = idx === 0;
    modalPrevBtn.style.opacity = idx === 0 ? "0.4" : "1";
    modalNextBtn.disabled = idx === data.steps.length - 1;
    modalNextBtn.style.opacity = idx === data.steps.length - 1 ? "0.4" : "1";

    lightboxBackdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function setModalPhoto(type) {
    const step = data.steps[activeModalStepIndex];
    if (type === "detail") {
      modalMainImg.src = step.detailImage;
      modalPhotoCaption.textContent = `🔬 內部構造與水質特寫：${step.detailCaption}`;
      modalThumbMain.classList.remove("active");
      modalThumbDetail.classList.add("active");
    } else {
      modalMainImg.src = step.mainImage;
      modalPhotoCaption.textContent = `📷 現場運轉實景：${step.mainCaption}`;
      modalThumbMain.classList.add("active");
      modalThumbDetail.classList.remove("active");
    }
  }

  function closeLightbox() {
    lightboxBackdrop.classList.remove("open");
    document.body.style.overflow = "";
  }

  // Bind UI Events
  function bindEvents() {
    viewMainBtn.addEventListener("click", () => setStageViewMode("main"));
    viewDetailBtn.addEventListener("click", () => setStageViewMode("detail"));
    viewSplitBtn.addEventListener("click", () => setStageViewMode("split"));
    stageOpenModalBtn.addEventListener("click", () => openLightbox(currentStepIndex, currentStageMode === "detail" ? "detail" : "main"));

    // Mode Switching (Scrollytelling vs Grid)
    modeScrollyBtn.addEventListener("click", () => {
      currentDisplayMode = "scrolly";
      modeScrollyBtn.classList.add("active");
      modeGridBtn.classList.remove("active");
      scrollyContainer.classList.remove("hidden");
      gridViewContainer.classList.remove("active");
    });

    modeGridBtn.addEventListener("click", () => {
      currentDisplayMode = "grid";
      modeGridBtn.classList.add("active");
      modeScrollyBtn.classList.remove("active");
      scrollyContainer.classList.add("hidden");
      gridViewContainer.classList.add("active");
    });

    // Modal Events
    modalCloseBtn.addEventListener("click", closeLightbox);
    lightboxBackdrop.addEventListener("click", (e) => {
      if (e.target === lightboxBackdrop) closeLightbox();
    });

    modalThumbMain.addEventListener("click", () => setModalPhoto("main"));
    modalThumbDetail.addEventListener("click", () => setModalPhoto("detail"));

    modalPrevBtn.addEventListener("click", () => {
      if (activeModalStepIndex > 0) openLightbox(activeModalStepIndex - 1, "main");
    });
    modalNextBtn.addEventListener("click", () => {
      if (activeModalStepIndex < data.steps.length - 1) openLightbox(activeModalStepIndex + 1, "main");
    });

    // Modal Tabs
    document.querySelectorAll(".modal-tab-btn").forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        const targetId = tabBtn.getAttribute("data-tab");
        document.querySelectorAll(".modal-tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
        tabBtn.classList.add("active");
        document.getElementById(targetId).classList.add("active");
      });
    });

    // Keyboard Shortcuts
    window.addEventListener("keydown", (e) => {
      if (!lightboxBackdrop.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft" && activeModalStepIndex > 0) {
        openLightbox(activeModalStepIndex - 1, "main");
      }
      if (e.key === "ArrowRight" && activeModalStepIndex < data.steps.length - 1) {
        openLightbox(activeModalStepIndex + 1, "main");
      }
    });
  }

  // Boot
  renderNavPills();
  renderNarrativeCards();
  renderTimelineGrid();
  renderExtraSections();
  updateActiveStep(0);
  initSplitSliderEvents();
  initScrollObserver();
  bindEvents();
})();
