(() => {
  const ICON_SVGS = {
    package:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8.5 12 4l9 4.5v9L12 22 3 17.5v-9Z" stroke="currentColor" stroke-width="1.8"/><path d="M12 22V13M3 8.5 12 13l9-4.5" stroke="currentColor" stroke-width="1.8"/></svg>',
    truck:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8h10v9H3V8Z" stroke="currentColor" stroke-width="1.8"/><path d="M13 11h4.2L20 14.2V17h-7v-6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7" cy="18.2" r="1.6" stroke="currentColor" stroke-width="1.6"/><circle cx="16.5" cy="18.2" r="1.6" stroke="currentColor" stroke-width="1.6"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/><path d="m8.5 12.2 2.4 2.4 4.6-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    clockSolid:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 6.8v5.5l3.7 2.2" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    box:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8.5 12 4l9 4.5v9L12 22 3 17.5v-9Z" stroke="currentColor" stroke-width="1.8"/></svg>',
    calendar:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M8 3v4M16 3v4M4 10h16" stroke="currentColor" stroke-width="1.8"/></svg>',
    home:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 11 8-7 8 7v9H4v-9Z" stroke="currentColor" stroke-width="1.8"/></svg>',
    bag:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.2 8.2h11.6l-1 12.3H7.2l-1-12.3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 8.2V7.1a3 3 0 0 1 6 0v1.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    pin:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 21s6.5-5.8 6.5-11A6.5 6.5 0 1 0 5.5 10c0 5.2 6.5 11 6.5 11Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="10" r="2.1" stroke="currentColor" stroke-width="1.8"/></svg>',
  };

  function icon(name) {
    const svg = ICON_SVGS[name] || ICON_SVGS.bag;
    return `<span class="edd-icon">${svg}</span>`;
  }

  function background(style) {
    if (style.backgroundType === "TRANSPARENT") return "transparent";
    if (style.backgroundType === "GRADIENT") {
      return `linear-gradient(to bottom, ${style.gradientStart}, ${style.gradientEnd})`;
    }
    return style.backgroundColor || "#e8e8e8";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const HIGHLIGHT_KEYS = /^(counter|countdown|delivery_from|delivery_to|delivery_date|processing_from|processing_to|processing_date|ordered_date|order_date)$/;

  function applyTags(template, delivery, highlight) {
    return String(template || "").replace(/\{([a-z_]+)\}/gi, (match, key) => {
      if (!Object.prototype.hasOwnProperty.call(delivery || {}, key)) return match;
      const value = escapeHtml(delivery[key] ?? "");
      return highlight && HIGHLIGHT_KEYS.test(key) ? `<strong>${value}</strong>` : value;
    });
  }

  function formatSeconds(total) {
    const seconds = Math.max(0, Number(total) || 0);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0
      ? `${String(hours).padStart(2, "0")}\u00a0h\u00a0${String(minutes).padStart(2, "0")}\u00a0min`
      : `${String(minutes).padStart(2, "0")}\u00a0min`;
  }

  function hideRoot(root) {
    root.innerHTML = "";
    root.hidden = true;
    root.style.display = "none";
  }

  function isDuplicateRoot(root) {
    const location = root.dataset.location || "PRODUCT";
    const roots = [...document.querySelectorAll(`[data-edd-root][data-location="${location}"]`)];
    return roots.indexOf(root) > 0;
  }

  function proxyUrl(raw, fallbackPath) {
    try {
      const parsed = new URL(raw || fallbackPath, window.location.origin);
      return new URL(`${parsed.pathname}${parsed.search}`, window.location.origin);
    } catch {
      return new URL(fallbackPath, window.location.origin);
    }
  }

  function shouldShowDates(widget) {
    if (!widget?.delivery) return false;
    return widget.pincode?.available !== false;
  }

  function ensureShell(root) {
    if (root.querySelector("[data-edd-card]")) return;
    root.innerHTML = `<div class="edd-widget essential-estimated-delivery-widget essential-estimated-delivery-card" data-edd-card>
      <div data-edd-body></div>
      <div data-edd-extras></div>
    </div>`;
  }

  function applyCardStyle(card, style) {
    const cardBackground = style.backgroundType === "TRANSPARENT" ? "#ffffff" : style.backgroundColor || "#e8e8e8";
    card.style.background = background(style);
    card.style.borderRadius = `${style.borderRadius || 8}px`;
    card.style.border = `${style.borderWidth || 0}px solid ${style.borderColor || "transparent"}`;
    card.style.padding = `${style.paddingTop || 16}px ${style.paddingRight || 16}px ${style.paddingBottom || 12}px ${style.paddingLeft || 16}px`;
    card.style.color = style.textColor || "#202223";
    card.style.fontFamily = style.fontFamily || "inherit";
    card.style.fontSize = `${style.fontSize || 14}px`;
    card.style.setProperty("--edd-card-bg", cardBackground);
    card.style.setProperty("--edd-icon-box", `${style.iconSize || 22}px`);
    card.style.setProperty("--edd-theme", style.themeColor || "#202223");
  }

  function renderCard(root, payload) {
    const widget = payload.widget;
    const card = root.querySelector("[data-edd-card]");
    const body = root.querySelector("[data-edd-body]");
    if (!widget || !card || !body) return;
    const style = widget.style || {};
    applyCardStyle(card, style);
    const css = String(style.customCss || "").replace(/<\/style/gi, "");
    if (!shouldShowDates(widget)) {
      body.innerHTML = css ? `<style>${css}</style>` : "";
      return;
    }
    const theme = style.themeColor || "#202223";
    const textColor = style.textColor || "#202223";
    const progress = style.progressColor || theme;
    const delivery = widget.delivery || {};
    const icons = widget.icons || {};
    const heading = widget.heading || "";
    const showDescription = widget.descriptionEnabled !== false;
    const message = applyTags(widget.message, delivery, true);
    const items = widget.items || [];
    const perProduct = widget.cart?.displayMode === "PER_PRODUCT" && items.length;
    const design = String(widget.design || (widget.layout === "MINIMAL" ? "COMPACT" : "TIMELINE")).toUpperCase();
    const iconSize = style.iconSize || 22;
    const steps = [
      {
        icon: icons.purchased || "bag",
        title: icons.purchasedTitle || "Purchased",
        color: icons.purchasedColor || theme,
        date: delivery.purchasedLabel || "",
      },
      {
        icon: icons.processing || "truck",
        title: icons.processingTitle || "Processing",
        color: icons.processingColor || theme,
        date: delivery.processingLabel || "",
      },
      {
        icon: icons.delivered || "pin",
        title: icons.deliveredTitle || "Delivered",
        color: icons.deliveredColor || theme,
        date: delivery.deliveredLabel || "",
      },
    ];
    const gap = style.paddingMiddle || 12;
    const clock = `<span class="edd-widget__clock" aria-hidden="true">${icon("clockSolid")}</span>`;

    const timeline =
      design === "COMPACT"
        ? `<p class="edd-widget__minimal" style="color:${style.dateColor || textColor};font-size:${style.dateFontSize || 11}px">Delivery ${escapeHtml(delivery.deliveredLabel || delivery.delivery_from || "")}</p>`
        : design === "PILL"
          ? `<div class="edd-widget__pills">${steps
              .map((step) => `<span class="edd-widget__pill" style="color:${step.color};border-color:${step.color}">${escapeHtml(step.title)}: ${escapeHtml(step.date)}</span>`)
              .join("")}</div>`
          : design === "CARD"
            ? `<div class="edd-widget__rows">${steps
                .map(
                  (step) =>
                    `<div class="edd-widget__row"><span class="edd-widget__icon" style="color:${step.color}">${icon(step.icon)}</span><span><b style="color:${style.statusColor || textColor};font-size:${style.statusFontSize || 12}px">${escapeHtml(step.title)}</b><i style="color:${style.dateColor || textColor};font-size:${style.dateFontSize || 11}px">${escapeHtml(step.date)}</i></span></div>`,
                )
                .join("")}</div>`
            : `<div class="edd-widget__timeline${design === "STACKED" ? " edd-widget__timeline--stacked" : ""}">${steps
                .map((step, index) => {
                  const connector =
                    index > 0 && design !== "STACKED"
                      ? `<span class="edd-widget__connector" aria-hidden="true"><span class="edd-widget__connector-line" style="background:${progress};height:${style.progressWidth || 2}px"></span><span class="edd-widget__connector-arrow" style="border-left-color:${progress}"></span></span>`
                      : "";
                  return `${connector}
            <div class="edd-widget__step">
              <span class="edd-widget__icon" style="color:${step.color};width:${iconSize}px;height:${iconSize}px">${icon(step.icon)}</span>
              <span class="edd-widget__meta">
                <span class="edd-widget__date" style="color:${style.dateColor || textColor};font-size:${style.dateFontSize || 11}px">${escapeHtml(step.date)}</span>
                <span class="edd-widget__label" style="color:${style.statusColor || textColor};font-size:${style.statusFontSize || 12}px">${escapeHtml(step.title)}</span>
              </span>
            </div>`;
                })
                .join("")}</div>`;

    body.innerHTML = `
      ${css ? `<style>${css}</style>` : ""}
      ${heading ? `<p class="edd-widget__heading">${escapeHtml(heading)}</p>` : ""}
      ${showDescription ? `<div class="edd-widget__message-row essential-estimated-delivery-description" style="color:${style.dynamicColor || textColor};margin-bottom:${gap}px">${clock}<p class="edd-widget__message" data-edd-message>${message}</p></div>` : ""}
      ${timeline}
      ${
        perProduct
          ? `<div class="edd-widget__items">${items
              .map(
                (item) =>
                  `<p class="edd-widget__item">${escapeHtml(item.title || "")} — ${escapeHtml(item.delivery?.delivery_from || "")} to ${escapeHtml(item.delivery?.delivery_to || "")}</p>`,
              )
              .join("")}</div>`
          : ""
      }
    `;
  }

  function pincodeStatus(pincode) {
    if (pincode.available === false) return pincode.message || "Delivery not available for this pincode.";
    if (pincode.available) {
      return pincode.label ? `Delivery available — ${pincode.label}` : "Delivery available for this pincode.";
    }
    return "";
  }

  function renderExtras(root, payload) {
    const extras = root.querySelector("[data-edd-extras]");
    const widget = payload.widget;
    if (!extras || !widget) return;
    const pincode = widget.pincode || {};
    if (!pincode.enabled) {
      extras.innerHTML = "";
      extras.hidden = true;
      return;
    }
    extras.hidden = false;
    const value = extras.querySelector("[data-edd-pincode-input]")?.value || pincode.code || "";
    const fieldId = `edd-pincode-${root.dataset.productId || "widget"}`.replace(/[^a-zA-Z0-9_-]/g, "");
    const tone = pincode.available === false ? "error" : pincode.available ? "ok" : "";
    extras.innerHTML = `
      <form class="edd-check" data-edd-pincode-form>
        <p class="edd-check__title">Check delivery</p>
        <div class="edd-check__row">
          <input id="${fieldId}" class="edd-check__input" data-edd-pincode-input type="text" inputmode="numeric" autocomplete="postal-code" placeholder="Enter pincode" value="${escapeHtml(value)}" aria-label="Pincode">
          <button class="edd-check__button" type="submit">Check</button>
        </div>
        <p class="edd-check__status" data-edd-pincode-status ${tone ? `data-tone="${tone}"` : ""}>${escapeHtml(pincodeStatus(pincode))}</p>
      </form>
    `;
  }

  function startCountdown(root, payload) {
    const widget = payload.widget;
    if (!widget?.delivery || !shouldShowDates(widget)) return;
    if (root.dataset.eddCountdown) return;
    root.dataset.eddCountdown = "true";
    let remaining = Number(widget.delivery.countdownSeconds || 0);
    if (!remaining) return;
    window.setInterval(() => {
      remaining = Math.max(0, remaining - 1);
      if (!payload.widget?.delivery) return;
      payload.widget.delivery.counter = formatSeconds(remaining);
      payload.widget.delivery.countdown = payload.widget.delivery.counter;
      const messageEl = root.querySelector("[data-edd-message]");
      if (messageEl) messageEl.innerHTML = applyTags(payload.widget.message, payload.widget.delivery, true);
    }, 1000);
  }

  function track(root, body) {
    const url = proxyUrl(root.dataset.eventsUrl, "/apps/delivery-date/events");
    const params = new URLSearchParams();
    params.set("widgetId", body.widgetId);
    params.set("type", body.type);
    if (body.productId) params.set("productId", body.productId);
    const encoded = params.toString();
    fetch(url.pathname, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: encoded,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {
      fetch(`${url.pathname}?${encoded}`, { method: "GET", keepalive: true, credentials: "same-origin" }).catch(() => {});
    });
  }

  function bindTracking(root, payload) {
    const widgetId = payload.widget?.id;
    if (!widgetId || root.dataset.eddTracked) return;
    root.dataset.eddTracked = "true";
    const eventBody = { widgetId, productId: root.dataset.productId };
    track(root, { ...eventBody, type: "IMPRESSION" });

    root.addEventListener("click", (event) => {
      if (event.target instanceof Element && event.target.closest("[data-edd-pincode-form]")) return;
      track(root, { ...eventBody, type: "CLICK" });
    });

    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!/\/cart\/add/.test(form.action)) return;
      track(root, { ...eventBody, type: "ADD_TO_CART" });
    });
  }

  function bindPincode(root, payload, configUrl) {
    const extras = root.querySelector("[data-edd-extras]");
    if (!extras || extras.dataset.eddBound) return;
    extras.dataset.eddBound = "true";
    extras.addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = extras.querySelector("[data-edd-pincode-input]");
      const status = extras.querySelector("[data-edd-pincode-status]");
      const code = String(input?.value || "").trim();
      if (!code) return;
      if (status) {
        status.textContent = "Checking…";
        status.removeAttribute("data-tone");
      }
      const nextUrl = new URL(configUrl.toString());
      nextUrl.searchParams.set("pincode", code);
      try {
        const response = await fetch(nextUrl.toString(), { credentials: "same-origin" });
        if (!response.ok) throw new Error("lookup failed");
        const nextPayload = await response.json();
        payload.widget = nextPayload.widget;
        if (!payload.widget) return;
        renderCard(root, payload);
        renderExtras(root, payload);
        delete root.dataset.eddCountdown;
        startCountdown(root, payload);
      } catch {
        if (status) {
          status.textContent = "Could not check this pincode. Try again.";
          status.setAttribute("data-tone", "error");
        }
      }
    });
  }

  async function init(root) {
    if (root.dataset.eddReady) return;
    root.dataset.eddReady = "true";
    const location = root.dataset.location || "PRODUCT";
    if (isDuplicateRoot(root)) {
      hideRoot(root);
      return;
    }

    const configUrl = proxyUrl(root.dataset.configUrl, "/apps/delivery-date/config");
    configUrl.searchParams.set("location", location);
    if (root.dataset.productId) configUrl.searchParams.set("productId", root.dataset.productId);
    if (root.dataset.collectionIds) {
      configUrl.searchParams.set("collectionIds", root.dataset.collectionIds);
    }
    if (root.dataset.locale) configUrl.searchParams.set("locale", root.dataset.locale);
    if (root.dataset.market) configUrl.searchParams.set("market", root.dataset.market);
    if (root.dataset.country) configUrl.searchParams.set("country", root.dataset.country);
    if (root.dataset.productName) configUrl.searchParams.set("productName", root.dataset.productName);
    if (root.dataset.stockLeft) configUrl.searchParams.set("stockLeft", root.dataset.stockLeft);
    if (root.dataset.cartItems) configUrl.searchParams.set("cartItems", root.dataset.cartItems);
    if (root.dataset.productWeight) configUrl.searchParams.set("productWeight", root.dataset.productWeight);

    const response = await fetch(configUrl.toString(), { credentials: "same-origin" });
    if (!response.ok) return;
    const payload = await response.json();
    if (!payload.widget) {
      hideRoot(root);
      return;
    }
    root.hidden = false;
    root.style.removeProperty("display");
    ensureShell(root);
    renderCard(root, payload);
    renderExtras(root, payload);
    bindPincode(root, payload, configUrl);
    startCountdown(root, payload);
    bindTracking(root, payload);
  }

  document.querySelectorAll("[data-edd-root]").forEach((root) => {
    init(root).catch(() => {});
  });
})();
