(() => {
  if (window.__eddDeliveryWidget) return;
  window.__eddDeliveryWidget = true;

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
    flag:
      '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 20V5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 5h13l-2.4 3.6L19 12.2H6V5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  };

  function icon(name) {
    const value = String(name || "").trim();
    if (/^(https?:\/\/|data:image\/|blob:|\/\/)/i.test(value)) {
      const src = value.startsWith("data:image/") ? value.replace(/"/g, "") : escapeHtml(value);
      return `<span class="edd-icon edd-icon--image"><img src="${src}" alt=""></span>`;
    }
    const svg = ICON_SVGS[value] || ICON_SVGS.package || ICON_SVGS.bag;
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

  function isThemeEditor() {
    return Boolean(window.Shopify?.designMode || window.Shopify?.visualPreviewMode);
  }

  function isCartPage() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/cart" || path.endsWith("/cart")) return true;
    if (document.querySelector("[data-edd-root][data-location='CART']")) return true;
    return Boolean(
      document.querySelector("form[action='/cart'], form[action$='/cart'], #main-cart-items, cart-items"),
    );
  }

  function isProductPage() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    return path.includes("/products/");
  }

  function isCollectionPage() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    return /\/collections\/[^/]+/.test(path) && !path.includes("/products/");
  }

  function compactResourceIds(value) {
    return String(value || "")
      .split(",")
      .map((part) => (String(part).match(/(\d{1,20})\s*$/) || [])[1])
      .filter(Boolean)
      .filter((id, index, all) => all.indexOf(id) === index)
      .slice(0, 40)
      .join(",");
  }

  function inCartDrawer(node) {
    return Boolean(node?.closest("cart-drawer, #CartDrawer, .cart-drawer, [id*='CartDrawer']"));
  }

  function checkoutButton() {
    const selectors = [
      "#main-cart-footer [name='checkout']",
      "#main-cart-footer button[name='checkout']",
      ".cart__footer [name='checkout']",
      ".cart__checkout-button",
      "form#cart [name='checkout']",
      'form[action="/cart"] [name="checkout"]',
      'form[action$="/cart"] [name="checkout"]',
      "button[name='checkout']",
      "[name='checkout']",
      'a[href*="/checkout"]',
    ];
    for (const selector of selectors) {
      let nodes = [];
      try {
        nodes = [...document.querySelectorAll(selector)];
      } catch {
        continue;
      }
      const match = nodes.find((node) => !inCartDrawer(node));
      if (match) return match;
    }
    return null;
  }

  function preferredRoot(root) {
    const location = root.dataset.location || "PRODUCT";
    const roots = [...document.querySelectorAll(`[data-edd-root][data-location="${location}"]`)];
    if (roots.length <= 1) return roots[0] || root;
    if (location !== "CART") return roots[0];
    const checkout = checkoutButton();
    if (!checkout) return roots[roots.length - 1] || roots[0];
    let best = roots[0];
    let bestScore = -1;
    roots.forEach((item) => {
      const node = movableNode(item);
      let score = 0;
      if (checkout.parentElement && (checkout.parentElement === node.parentElement || checkout.parentElement.contains(node))) {
        score += 100;
      }
      if (inCartDrawer(item)) {
        score -= 80;
      }
      if (item.closest("#main-cart-footer, [id*='cart-footer'], [id*='CartFooter'], .cart__footer")) {
        score += 50;
      }
      try {
        if (node.compareDocumentPosition(checkout) & Node.DOCUMENT_POSITION_FOLLOWING) score += 15;
      } catch {
        // Ignore nodes detached during theme editor rerenders.
      }
      if (score > bestScore) {
        best = item;
        bestScore = score;
      }
    });
    return bestScore > 0 ? best : roots[roots.length - 1] || roots[0];
  }

  function isDuplicateRoot(root) {
    if (isThemeEditor()) return false;
    return preferredRoot(root) !== root;
  }

  function checkoutMount(checkout) {
    if (!checkout || inCartDrawer(checkout)) return null;
    const ctas =
      checkout.closest("#main-cart-footer .cart__ctas") ||
      checkout.closest(".cart__ctas") ||
      checkout.closest("[class*='cart__ctas']");
    if (ctas) return ctas;
    const footer = checkout.closest("#main-cart-footer, .cart__footer");
    if (footer) {
      let child = checkout;
      while (child.parentElement && child.parentElement !== footer) {
        child = child.parentElement;
      }
      return child;
    }
    return checkout.parentElement;
  }

  function proxyUrl(raw, fallbackPath) {
    try {
      const parsed = new URL(raw || fallbackPath, window.location.origin);
      return new URL(`${parsed.pathname}${parsed.search}`, window.location.origin);
    } catch {
      return new URL(fallbackPath, window.location.origin);
    }
  }

  function isOkPayload(payload) {
    return Boolean(payload && (payload.ok || payload.id) && !payload.error);
  }

  async function sendProxy(url, params, { keepalive = false } = {}) {
    const encoded = params.toString();
    const headers = { Accept: "application/json" };
    const withQuery = `${url.pathname}${url.search}${url.search ? "&" : "?"}${encoded}`;
    const getResponse = await fetch(withQuery, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers,
      keepalive,
    });
    const getPayload = await getResponse.json().catch(() => ({}));
    if (getResponse.ok && isOkPayload(getPayload)) return getPayload;

    const postResponse = await fetch(withQuery, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: encoded,
      credentials: "same-origin",
      cache: "no-store",
      keepalive,
    });
    const postPayload = await postResponse.json().catch(() => ({}));
    if (postResponse.ok && isOkPayload(postPayload)) return postPayload;
    throw new Error(postPayload.error || getPayload.error || "request failed");
  }

  function shouldShowDates(widget) {
    if (!widget?.delivery) return false;
    const pincode = widget.pincode || {};
    const mode = widget.weight?.displayMode;
    if (mode === "DIRECT" || !pincode.enabled) return true;
    if (mode === "PINCODE") return pincode.available === true;
    return pincode.available !== false;
  }

  function ensureShell(root) {
    if (root.querySelector("[data-edd-card]")) return;
    const cartClass = (root.dataset.location || "") === "CART" ? " edd-widget--cart" : "";
    root.innerHTML = `<div class="edd-widget essential-estimated-delivery-widget essential-estimated-delivery-card${cartClass}" data-edd-card>
      <div data-edd-body></div>
      <div data-edd-extras></div>
    </div>`;
  }

  function readablePx(value, fallback, min) {
    const size = Number(value);
    const next = Number.isFinite(size) && size > 0 ? size : fallback;
    return Math.max(min, next);
  }

  function applyCardStyle(card, style) {
    const cardBackground = style.backgroundType === "TRANSPARENT" ? "#ffffff" : style.backgroundColor || "#e8e8e8";
    const fontSize = readablePx(style.fontSize, 15, 14);
    const dateSize = readablePx(style.dateFontSize, 13, 12);
    const statusSize = readablePx(style.statusFontSize, 13, 12);
    const iconSize = readablePx(style.iconSize, 24, 22);
    card.style.background = background(style);
    card.style.borderRadius = `${style.borderRadius || 8}px`;
    card.style.border = `${style.borderWidth || 0}px solid ${style.borderColor || "transparent"}`;
    card.style.padding = `${style.paddingTop || 16}px ${style.paddingRight || 16}px ${style.paddingBottom || 16}px ${style.paddingLeft || 16}px`;
    card.style.color = style.textColor || "#202223";
    card.style.fontFamily = style.fontFamily || "inherit";
    card.style.fontSize = `${fontSize}px`;
    card.style.width = "100%";
    card.style.boxSizing = "border-box";
    card.style.setProperty("--edd-card-bg", cardBackground);
    card.style.setProperty("--edd-icon-box", `${iconSize}px`);
    card.style.setProperty("--edd-theme", style.themeColor || "#202223");
    card.style.setProperty("--edd-progress", style.progressColor || style.themeColor || "#202223");
    card.style.setProperty("--edd-font", `${fontSize}px`);
    card.style.setProperty("--edd-date-size", `${dateSize}px`);
    card.style.setProperty("--edd-status-size", `${statusSize}px`);
  }

  function renderCard(root, payload) {
    const widget = payload.widget;
    const card = root.querySelector("[data-edd-card]");
    const body = root.querySelector("[data-edd-body]");
    if (!widget || !card || !body) return;
    const style = widget.style || {};
    applyCardStyle(card, style);
    const isCart = widget.location === "CART";
    const css = String(style.customCss || "").replace(/<\/style/gi, "");
    const directWeight =
      !isCart && widget.weight?.displayMode === "DIRECT" && widget.weight?.value
        ? `<p class="edd-widget__weight">Weight: ${escapeHtml(widget.weight.value)}</p>`
        : "";
    if (!shouldShowDates(widget)) {
      body.innerHTML = `${css ? `<style>${css}</style>` : ""}${directWeight}`;
      return;
    }
    const theme = style.themeColor || "#202223";
    const textColor = style.textColor || "#202223";
    const progress = style.progressColor || theme;
    const delivery = widget.delivery || {};
    const icons = widget.icons || {};
    const heading = widget.heading || "";
    const headerIcon = icons.headerIcon || "flag";
    const headerEnabled = icons.headerIconEnabled !== false;
    const headingText = heading || "Estimated Delivery Date";
    let design = String(widget.design || (widget.layout === "MINIMAL" ? "COMPACT" : "TIMELINE")).toUpperCase();
    if (isCart && (design === "COMPACT" || design === "MINIMAL")) design = "TIMELINE";
    const showDescription = widget.descriptionEnabled !== false && !["BANNER", "CARD", "TRACKER"].includes(design);
    const message = applyTags(widget.message, delivery, true);
    const items = widget.items || [];
    const dateKeys = items.map((item) => `${item.delivery?.delivery_from || ""}|${item.delivery?.delivery_to || ""}`);
    const mixedDates = new Set(dateKeys).size > 1;
    const perProduct = isCart && widget.cart?.displayMode === "PER_PRODUCT" && items.length > 1 && mixedDates;
    const iconSize = readablePx(style.iconSize, 24, 22);
    const steps = [
      {
        icon: icons.purchased || "bag",
        enabled: icons.purchasedEnabled !== false,
        title: icons.purchasedTitle || "Purchased",
        color: icons.purchasedColor || theme,
        date: delivery.purchasedLabel || "",
      },
      {
        icon: icons.processing || "truck",
        enabled: icons.processingEnabled !== false,
        title: icons.processingTitle || "Processing",
        color: icons.processingColor || theme,
        date: delivery.processingLabel || "",
      },
      {
        icon: icons.delivered || "pin",
        enabled: icons.deliveredEnabled !== false,
        title: icons.deliveredTitle || "Delivered",
        color: icons.deliveredColor || theme,
        date: delivery.deliveredLabel || "",
      },
    ];
    const gap = style.paddingMiddle || 12;
    const clock = `<span class="edd-widget__clock" aria-hidden="true">${icon("clockSolid")}</span>`;

    const headerMarkup = headerEnabled
      ? `<span class="edd-widget__banner-icon">${icon(headerIcon)}</span>`
      : "";
    const highlightMarkup = headerEnabled
      ? `<span class="edd-widget__highlight-icon">${icon(headerIcon || icons.delivered || "pin")}</span>`
      : "";
    const trackerFlag = headerEnabled
      ? `<span class="edd-widget__tracker-flag">${icon(headerIcon)}</span>`
      : "";
    const deliveredRange = escapeHtml(delivery.deliveredLabel || delivery.delivery_from || "");
    const timeline =
      design === "BANNER"
        ? `<div class="edd-widget__banner">${headerMarkup}<p class="edd-widget__banner-text">${escapeHtml(headingText)} <strong>${deliveredRange}</strong></p></div>`
        : design === "CARD"
          ? `<div class="edd-widget__highlight">${highlightMarkup}<p>${escapeHtml(headingText)} <strong>${deliveredRange}</strong></p></div>`
          : design === "TRACKER"
            ? `<div class="edd-widget__tracker"><div class="edd-widget__tracker-head">${trackerFlag}<p>${escapeHtml(headingText)} <strong>${deliveredRange}</strong></p></div><div class="edd-widget__tracker-steps">${steps
                .map(
                  (step, index) =>
                    `${index ? `<span class="edd-widget__tracker-dots" aria-hidden="true"></span>` : ""}<div class="edd-widget__tracker-step">${step.enabled ? `<span class="edd-widget__tracker-icon" style="color:${step.color}">${icon(step.icon)}</span>` : `<span class="edd-widget__tracker-icon edd-widget__tracker-icon--off" aria-hidden="true"></span>`}<b style="color:${style.statusColor || textColor}">${escapeHtml(step.title)}</b><i style="color:${style.dateColor || textColor}">${escapeHtml(step.date)}</i></div>`,
                )
                .join("")}</div></div>`
        : design === "COMPACT"
        ? `<p class="edd-widget__minimal" style="color:${style.dateColor || textColor}">Delivery ${escapeHtml(delivery.deliveredLabel || delivery.delivery_from || "")}</p>`
        : design === "PILL"
          ? `<div class="edd-widget__pills">${steps
              .map((step) => `<span class="edd-widget__pill" style="color:${step.color};border-color:${step.color}">${escapeHtml(step.title)}: ${escapeHtml(step.date)}</span>`)
              .join("")}</div>`
          : `<div class="edd-widget__timeline${design === "STACKED" ? " edd-widget__timeline--stacked" : ""}">${steps
                .map((step, index) => {
                  const connector =
                    index > 0 && design !== "STACKED"
                      ? `<span class="edd-widget__connector" aria-hidden="true"><span class="edd-widget__connector-line" style="background:${progress};height:${style.progressWidth || 2}px"></span><span class="edd-widget__connector-arrow" style="border-left-color:${progress}"></span></span>`
                      : "";
                  const stepIcon = step.enabled
                    ? `<span class="edd-widget__icon" style="color:${step.color};width:${iconSize}px;height:${iconSize}px">${icon(step.icon)}</span>`
                    : "";
                  return `${connector}
            <div class="edd-widget__step">
              ${stepIcon}
              <span class="edd-widget__meta">
                <span class="edd-widget__date" style="color:${style.dateColor || textColor}">${escapeHtml(step.date)}</span>
                <span class="edd-widget__label" style="color:${style.statusColor || textColor}">${escapeHtml(step.title)}</span>
              </span>
            </div>`;
                })
                .join("")}</div>`;

    body.innerHTML = `
      ${css ? `<style>${css}</style>` : ""}
      ${heading && !["BANNER", "CARD", "TRACKER"].includes(design) ? `<p class="edd-widget__heading">${escapeHtml(heading)}</p>` : ""}
      ${directWeight}
      ${showDescription ? `<div class="edd-widget__message-row essential-estimated-delivery-description" style="color:${style.dynamicColor || textColor};margin-bottom:${gap}px">${clock}<p class="edd-widget__message" data-edd-message>${message}</p></div>` : ""}
      ${timeline}
      ${
        perProduct
          ? `<div class="edd-widget__items">${items
              .map(
                (item) =>
                  `<div class="edd-widget__item"><span class="edd-widget__item-title">${escapeHtml(item.title || "")}</span><span class="edd-widget__item-dates">${escapeHtml(item.delivery?.delivery_from || "")} – ${escapeHtml(item.delivery?.delivery_to || "")}</span></div>`,
              )
              .join("")}</div>`
          : ""
      }
    `;
  }

  function pincodeStatus(pincode) {
    if (pincode.available === false) return pincode.message || "Delivery unavailable";
    if (pincode.available) {
      const bits = [pincode.message || "Delivery available"];
      if (pincode.label) bits.push(pincode.label);
      if (pincode.weight) bits.push(pincode.weight);
      return bits.join(" — ");
    }
    return "";
  }

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function renderExtras(root, payload) {
    const extras = root.querySelector("[data-edd-extras]");
    const widget = payload.widget;
    if (!extras || !widget) return;
    const pincode = widget.pincode || {};
    const showPincode =
      Boolean(pincode.enabled) && widget.weight?.displayMode !== "DIRECT" && widget.location !== "CART";
    if (!showPincode) {
      extras.innerHTML = "";
      extras.hidden = true;
      return;
    }
    extras.hidden = false;
    const value = extras.querySelector("[data-edd-pincode-input]")?.value || pincode.code || "";
    const fieldId = `edd-pincode-${root.dataset.productId || "widget"}`.replace(/[^a-zA-Z0-9_-]/g, "");
    const tone = pincode.available === false ? "error" : pincode.available ? "ok" : "";
    const requestButton =
      pincode.available === false
        ? `<button class="edd-request-btn" type="button" data-edd-request form="edd-pincode-unbound">Request delivery</button>`
        : "";
    extras.innerHTML = `
      <div class="edd-check" data-edd-pincode-form>
        <p class="edd-check__title">Check delivery</p>
        <div class="edd-check__row">
          <input id="${fieldId}" class="edd-check__input" data-edd-pincode-input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="postal-code" placeholder="Enter pincode" value="${escapeHtml(digitsOnly(value))}" aria-label="Pincode" form="edd-pincode-unbound">
          <button class="edd-check__button" type="button" data-edd-check form="edd-pincode-unbound">Check</button>
        </div>
        <p class="edd-check__status" data-edd-pincode-status ${tone ? `data-tone="${tone}"` : ""}>${escapeHtml(pincodeStatus(pincode))}</p>
        ${requestButton}
      </div>
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
    sendProxy(url, params, { keepalive: true }).catch(() => {});
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

    const halt = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
    };

    const runCheck = async () => {
      const input = extras.querySelector("[data-edd-pincode-input]");
      const status = extras.querySelector("[data-edd-pincode-status]");
      const checkButton = extras.querySelector("[data-edd-check]");
      const code = digitsOnly(input?.value || "");
      if (!code) return;
      if (input) input.value = code;
      if (checkButton) checkButton.disabled = true;
      if (status) {
        status.textContent = "Checking…";
        status.removeAttribute("data-tone");
      }
      const nextUrl = new URL(configUrl.toString());
      nextUrl.searchParams.set("pincode", code);
      try {
        const response = await fetch(nextUrl.toString(), { credentials: "same-origin", cache: "no-store" });
        const nextPayload = await response.json().catch(() => ({}));
        if (!response.ok || !nextPayload.widget) throw new Error("lookup failed");
        payload.widget = nextPayload.widget;
        renderCard(root, payload);
        renderExtras(root, payload);
        delete root.dataset.eddCountdown;
        startCountdown(root, payload);
      } catch {
        const nextStatus = extras.querySelector("[data-edd-pincode-status]");
        if (nextStatus) {
          nextStatus.textContent = "Could not check this pincode. Try again.";
          nextStatus.setAttribute("data-tone", "error");
        }
        if (checkButton) checkButton.disabled = false;
      }
    };

    extras.addEventListener("input", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || !input.matches("[data-edd-pincode-input]")) return;
      const next = digitsOnly(input.value);
      if (input.value !== next) input.value = next;
    });
    extras.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter") return;
        if (!(event.target instanceof HTMLInputElement) || !event.target.matches("[data-edd-pincode-input]")) return;
        halt(event);
        runCheck();
      },
      true,
    );
    extras.addEventListener(
      "click",
      (event) => {
        const checkButton = event.target instanceof Element ? event.target.closest("[data-edd-check]") : null;
        if (!checkButton) return;
        halt(event);
        runCheck();
      },
      true,
    );
    extras.addEventListener("submit", (event) => {
      halt(event);
      runCheck();
    });
    extras.addEventListener("click", async (event) => {
      const button = event.target instanceof Element ? event.target.closest("[data-edd-request]") : null;
      if (!button) return;
      halt(event);
      const input = extras.querySelector("[data-edd-pincode-input]");
      const status = extras.querySelector("[data-edd-pincode-status]");
      const code = digitsOnly(input?.value || payload.widget?.pincode?.code || "");
      if (!code) return;
      button.disabled = true;
      const requestUrl = proxyUrl(root.dataset.requestUrl, "/apps/delivery-date/delivery-request");
      const params = new URLSearchParams();
      params.set("widgetId", payload.widget?.id || "");
      params.set("pincode", code);
      if (root.dataset.productId) params.set("productId", compactResourceIds(root.dataset.productId) || root.dataset.productId);
      if (root.dataset.productName) params.set("productTitle", root.dataset.productName);
      const collectionIds = compactResourceIds(root.dataset.collectionIds);
      if (!payload.widget?.id && collectionIds) {
        params.set("collectionIds", collectionIds);
      }
      try {
        await sendProxy(requestUrl, params);
        if (status) {
          status.textContent = "Delivery request sent. We’ll notify the store.";
          status.setAttribute("data-tone", "ok");
        }
        button.textContent = "Request sent";
      } catch {
        button.disabled = false;
        if (status) {
          status.textContent = "Could not send the delivery request. Try again.";
          status.setAttribute("data-tone", "error");
        }
      }
    });
  }

  function revealRoot(root) {
    root.hidden = false;
    root.removeAttribute("hidden");
    root.style.removeProperty("display");
    const host = movableNode(root);
    if (host !== root) host.style.removeProperty("display");
  }

  async function init(root) {
    if (root.dataset.eddReady) return;
    root.dataset.eddReady = "true";
    const location = root.dataset.location || "PRODUCT";
    try {
      if (location === "PRODUCT" && !isProductPage() && !isCollectionPage()) {
        hideRoot(root);
        return;
      }
      if (isDuplicateRoot(root)) {
        hideRoot(root);
        const block = movableNode(root);
        if (block !== root) block.style.display = "none";
        return;
      }

      const configUrl = proxyUrl(root.dataset.configUrl, "/apps/delivery-date/config");
      configUrl.searchParams.set("location", location);
      if (root.dataset.page) configUrl.searchParams.set("page", root.dataset.page);
      const productId = compactResourceIds(root.dataset.productId) || root.dataset.productId;
      if (productId) configUrl.searchParams.set("productId", productId);
      const collectionIds = compactResourceIds(root.dataset.collectionIds);
      if (collectionIds) {
        configUrl.searchParams.set("collectionIds", collectionIds);
      }
      if (root.dataset.locale) configUrl.searchParams.set("locale", root.dataset.locale);
      if (root.dataset.market) configUrl.searchParams.set("market", root.dataset.market);
      if (root.dataset.country) configUrl.searchParams.set("country", root.dataset.country);
      if (root.dataset.productName) configUrl.searchParams.set("productName", root.dataset.productName);
      if (root.dataset.stockLeft) configUrl.searchParams.set("stockLeft", root.dataset.stockLeft);
      if (root.dataset.cartItems) configUrl.searchParams.set("cartItems", root.dataset.cartItems);
      if (root.dataset.productWeight) configUrl.searchParams.set("productWeight", root.dataset.productWeight);

      const encoded = configUrl.searchParams.toString();
      const requestUrl = `${configUrl.pathname}?${encoded}`;
      let response = await fetch(requestUrl, {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok || location === "CART") {
        const posted = await fetch(configUrl.pathname, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: encoded,
        }).catch(() => null);
        if (posted && posted.ok) response = posted;
      }
      if (!response?.ok) {
        if (location !== "CART") {
          delete root.dataset.eddReady;
          hideRoot(root);
        } else {
          revealRoot(root);
        }
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!payload.widget) {
        if (location !== "CART") {
          delete root.dataset.eddReady;
          hideRoot(root);
        } else {
          revealRoot(root);
        }
        return;
      }
      revealRoot(root);
      if (location === "CART") {
        placeCartRoot(root, payload.widget.placement?.position);
      }
      if (location === "PRODUCT") {
        if (isCollectionPage()) placeCollectionRoot(root);
        else placeProductRoot(root, payload.widget.placement?.position);
      }
      ensureShell(root);
      renderCard(root, payload);
      renderExtras(root, payload);
      bindPincode(root, payload, configUrl);
      startCountdown(root, payload);
      bindTracking(root, payload);
    } catch {
      if (location !== "CART") {
        delete root.dataset.eddReady;
        hideRoot(root);
      } else {
        revealRoot(root);
      }
    }
  }

  function firstMatch(selectors) {
    for (const selector of selectors) {
      try {
        const node = document.querySelector(selector);
        if (node) return node;
      } catch {
        // Ignore invalid selectors in older browsers.
      }
    }
    return null;
  }

  function movableNode(root) {
    return root.closest("[id^='shopify-block'], .shopify-block, .shopify-app-block") || root;
  }

  function placeCollectionRoot(root) {
    if ((root.dataset.location || "") !== "PRODUCT" || !isCollectionPage()) return;
    if (root.dataset.eddPlaced === "COLLECTION") return;
    const node = movableNode(root);
    const heading = firstMatch([
      ".collection-hero__title",
      ".collection__title",
      ".collection-title",
      ".main-page-title",
      "h1",
    ]);
    if (heading?.parentNode) {
      heading.parentNode.insertBefore(node, heading.nextSibling);
    }
    root.dataset.eddPlaced = "COLLECTION";
  }

  function placeProductRoot(root, position) {
    if ((root.dataset.location || "") !== "PRODUCT" || !isProductPage()) return;

    const key =
      position === "ABOVE_ATC" || position === "PRODUCT_INFO" || position === "BELOW_ATC"
        ? position
        : "BELOW_ATC";
    if (root.dataset.eddPlaced === key) return;

    const node = movableNode(root);
    const atc = firstMatch([
      '[name="add"]',
      'button[name="add"]',
      'form[action*="/cart/add"] [type="submit"]',
      ".product-form__submit",
      ".product-form__cart-submit",
      "button.product-form__cart-submit",
      "[data-add-to-cart]",
    ]);
    const info = firstMatch([
      ".product__info-container",
      ".product__info",
      ".product-single__meta",
      ".product__title",
      "h1.product-title",
      ".product__description",
    ]);

    if (key === "PRODUCT_INFO" && info) {
      info.after(node);
    } else if (atc?.parentElement) {
      if (key === "ABOVE_ATC") atc.parentElement.insertBefore(node, atc);
      else atc.parentElement.insertBefore(node, atc.nextSibling);
    }
    root.dataset.eddPlaced = key;
  }

  function placeCartRoot(root, position) {
    if ((root.dataset.location || "") !== "CART") return;
    if (isThemeEditor() || position === "CUSTOM") return;

    const key = position === "AFTER_ITEMS" ? "AFTER_ITEMS" : "BEFORE_CHECKOUT";
    if (root.dataset.eddPlaced === key) return;

    const node = movableNode(root);
    if (inCartDrawer(node)) return;
    node.style.display = "block";
    node.style.width = "100%";
    node.style.maxWidth = "100%";
    node.style.flex = "1 1 100%";
    const checkout = checkoutButton();
    const mount = checkoutMount(checkout);
    if (inCartDrawer(mount) || inCartDrawer(checkout)) return;
    const items = firstMatch([
      "#main-cart-items",
      "cart-items",
      "[id*='CartItems']",
      ".cart-items",
      ".cart__items",
    ]);

    let placed = false;
    if (key === "AFTER_ITEMS" && items) {
      items.after(node);
      placed = true;
    } else if (mount?.parentElement) {
      mount.parentElement.insertBefore(node, mount);
      placed = true;
    } else if (checkout?.parentElement) {
      checkout.parentElement.insertBefore(node, checkout);
      placed = true;
    }
    if (placed) root.dataset.eddPlaced = key;
  }

  function boot() {
    document.querySelectorAll("[data-edd-root]").forEach((root) => {
      if (root.dataset.eddReady && (root.dataset.location || "") !== "CART") return;
      if ((root.dataset.location || "") === "CART" && root.hidden && !isDuplicateRoot(root)) {
        delete root.dataset.eddReady;
        revealRoot(root);
      }
      if ((root.dataset.location || "") === "CART" && root.dataset.eddReady && !root.dataset.eddPlaced && !root.hidden) {
        placeCartRoot(root);
      }
      init(root).catch(() => {
        delete root.dataset.eddReady;
      });
    });
  }

  let bootTimer = 0;
  function scheduleBoot() {
    if (bootTimer) return;
    bootTimer = window.setTimeout(() => {
      bootTimer = 0;
      boot();
    }, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
  function watch() {
    if (!document.body) return;
    new MutationObserver(scheduleBoot).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) watch();
  else document.addEventListener("DOMContentLoaded", watch, { once: true });
})();
