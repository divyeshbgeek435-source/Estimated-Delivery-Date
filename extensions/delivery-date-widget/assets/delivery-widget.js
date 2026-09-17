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
      '<svg viewBox="0 0 24 24" fill="none" overflow="visible" aria-hidden="true"><circle cx="12" cy="12" r="8.25" stroke="currentColor" stroke-width="1.85"/><path d="M12 8v4.7l3.1 1.85" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    clockSolid:
      '<svg viewBox="0 0 24 24" overflow="visible" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" stroke="currentColor" stroke-width="1.4"/><path d="M12 7.2v5.1l3.35 2" fill="none" stroke="var(--edd-card-bg, #fff)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
    const animated = {
      animTruck: { base: "truck", motion: "drive" },
      animPackage: { base: "package", motion: "bounce" },
      animBox: { base: "box", motion: "shake" },
      animClock: { base: "clock", motion: "tick" },
      animBag: { base: "bag", motion: "float" },
      animPin: { base: "pin", motion: "drop" },
      animCheck: { base: "check", motion: "pop" },
      animHome: { base: "home", motion: "bob" },
      animFlag: { base: "flag", motion: "wave" },
      animCalendar: { base: "calendar", motion: "flip" },
    }[value];
    if (animated) {
      const svg = ICON_SVGS[animated.base] || ICON_SVGS.package;
      return `<span class="edd-icon edd-icon--anim edd-icon--${animated.motion}" data-motion="${animated.motion}">${svg}</span>`;
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

  function customImageSrc(value) {
    const src = String(value || "").trim();
    if (!/^(https?:\/\/|data:image\/|blob:|\/\/)/i.test(src)) return "";
    if (src.startsWith("data:image/") && src.length > 400000) return "";
    return src;
  }

  function applyTags(template, delivery, highlight) {
    return String(template || "").replace(/\{([a-z_]+)\}/gi, (match, key) => {
      if (key === "image") {
        const src = customImageSrc(delivery?.image);
        if (!src) return "";
        const safe = src.startsWith("data:image/") ? src.replace(/"/g, "") : escapeHtml(src);
        return `<img class="edd-inline-image" src="${safe}" alt="" />`;
      }
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
    // Keep a visible placeholder in the theme editor so merchants can find the block.
    if (isThemeEditor()) {
      root.hidden = false;
      root.removeAttribute("hidden");
      root.style.removeProperty("display");
      if (!root.querySelector("[data-edd-editor-placeholder]")) {
        root.innerHTML =
          '<div data-edd-editor-placeholder class="edd-widget essential-estimated-delivery-widget" style="padding:12px 14px;border:1px dashed #8c9196;border-radius:8px;color:#6d7175;font-size:13px;line-height:1.4;background:#fff;">Estimated delivery will appear here when a live widget can be loaded.</div>';
      }
      return;
    }
    root.innerHTML = "";
    root.hidden = true;
    root.style.display = "none";
    const host = movableNode(root);
    if (host !== root) host.style.display = "none";
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
    if (path.includes("/products/")) return true;
    if (isThemeEditor() && document.querySelector("[data-edd-root][data-location='PRODUCT']")) return true;
    return false;
   }

  function isCollectionPage() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (/\/collections\/[^/]+/.test(path) && !path.includes("/products/")) return true;
    if (isThemeEditor() && document.querySelector("[data-edd-root][data-page='collection']")) return true;
    return false;
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
    if (location === "PRODUCT") {
      const withProduct = roots.find((item) => item.dataset.productId);
      if (withProduct) return withProduct;
      return roots[0];
    }
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
    return Boolean(payload && (payload.ok === true || payload.id) && !payload.error);
  }

  async function sendProxy(url, params, { keepalive = false, method = "auto" } = {}) {
    const encoded = params.toString();
    const headers = { Accept: "application/json" };
    const path = `${url.pathname}${url.search || ""}`;
    const withQuery = `${path}${path.includes("?") ? "&" : "?"}${encoded}`;

    const tryPost = async (useKeepalive) => {
      // Put params in the query too - app proxy sometimes forwards POST without the body.
      const response = await fetch(withQuery, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
        body: encoded,
        credentials: "same-origin",
        cache: "no-store",
        keepalive: useKeepalive,
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && isOkPayload(payload)) return payload;
      throw new Error(payload.error || `request failed (${response.status})`);
    };

    const tryGet = async (useKeepalive) => {
      const response = await fetch(withQuery, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers,
        keepalive: useKeepalive,
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && isOkPayload(payload)) return payload;
      throw new Error(payload.error || `request failed (${response.status})`);
    };

    if (method === "POST") {
      try {
        return await tryPost(false);
      } catch (firstError) {
        if (keepalive) {
          try {
            return await tryPost(true);
          } catch {
            // fall through
          }
        }
        throw firstError;
      }
    }

    if (method === "GET") {
      return tryGet(false);
    }

    // App proxy often strips POST bodies; prefer query-string GET (same as config).
    try {
      return await tryGet(false);
    } catch {
      try {
        return await tryPost(false);
      } catch (error) {
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          const blank = new Blob([encoded], { type: "application/x-www-form-urlencoded" });
          if (navigator.sendBeacon(withQuery, blank)) return { ok: true, beacon: true };
        }
        throw error;
      }
    }
  }

  function shouldShowDates(widget) {
    if (!widget?.delivery) return false;
    const pincode = widget.pincode || {};
    const mode = widget.weight?.displayMode;
    if (mode === "DIRECT" || !pincode.enabled) return true;
    if (mode === "PINCODE") return pincode.available === true;
    return pincode.available !== false;
  }

  function formatCartItemDeliveryDates(delivery) {
    const from = String(delivery?.delivery_from || "").trim();
    const to = String(delivery?.delivery_to || "").trim();
    if (!from && !to) return "";
    // Always show the product's own delivery window (start and end).
    if (from && to) return from === to ? from : `${from} – ${to}`;
    return to || from;
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

  function journeyRangeHtml(label, color) {
    const text = String(label || "").trim();
    if (!text) return "";
    const parts = text.split(/\s+-\s+|\s+to\s+/i);
    if (parts.length === 2) {
      let start = parts[0];
      let end = parts[1];
      if (/^\d/.test(end) && /^[A-Za-z]/.test(start)) {
        end = `${start.split(/\s+/)[0]} ${end}`;
      }
      return `<strong style="color:${color}">${escapeHtml(start)}</strong> to <strong style="color:${color}">${escapeHtml(end)}</strong>`;
    }
    return `<strong style="color:${color}">${escapeHtml(text)}</strong>`;
  }

  function animatedTemplateHtml({
    design,
    steps,
    headingText,
    showHeading,
    headingWeight,
    deliveredRange,
    style,
    textColor,
    theme,
    progress,
    headerEnabled,
    headerIcon,
    showDescription,
    descriptionHtml,
  }) {
    const accent = style.dynamicColor || style.dateColor || progress || theme;
    const status = style.statusColor || textColor;
    const date = style.dateColor || accent;
    const range = journeyRangeHtml(deliveredRange, accent);
    const titleOn = showHeading !== false;
    const weight = Number(headingWeight) || 600;
    const titleStyle = `font-weight:${weight}`;
    const headerIconHtml = headerEnabled
      ? `<span class="edd-anim__header-icon" style="color:${theme}">${icon(headerIcon || "flag")}</span>`
      : "";
    const titleRow = (className = "edd-anim__title-row") =>
      titleOn || headerEnabled
        ? `<div class="${className}">${headerIconHtml}${
            titleOn ? `<p class="edd-anim__title" style="${titleStyle}">${escapeHtml(headingText || "Estimated Delivery Date")}</p>` : ""
          }</div>`
        : "";
    const lead =
      showDescription && descriptionHtml
        ? `<p class="edd-anim__lead" style="color:${accent}" data-edd-message>${descriptionHtml}</p>`
        : "";
    const leadAbove =
      showDescription && descriptionHtml
        ? `<p class="edd-anim__lead edd-anim__lead--above" style="color:${accent}" data-edd-message>${descriptionHtml}</p>`
        : "";
    const stepIcon = (step, index, className) =>
      step.enabled
        ? `<span class="${className}${index === 1 ? " is-truck" : ""}" style="color:${step.color}">${icon(step.icon)}</span>`
        : `<span class="${className} is-off" aria-hidden="true"></span>`;

    if (design === "MOMENT") {
      const eyebrow =
        titleOn || headerEnabled
          ? `<p class="edd-anim__eyebrow" style="${titleOn ? titleStyle : ""}">${headerIconHtml}${
              titleOn ? escapeHtml(headingText || "") : ""
            }</p>`
          : "";
      return `<div class="edd-anim edd-anim--moment"><div class="edd-anim__copy">${eyebrow}${lead}</div><div class="edd-anim__rail-wrap"><span class="edd-anim__rail edd-anim__rail--dashed" style="color:${progress}" aria-hidden="true"></span><span class="edd-anim__rail-fill" style="background:${progress}" aria-hidden="true"></span><div class="edd-anim__nodes">${steps
        .map(
          (step, index) =>
            `<span class="edd-anim__node${index === 0 ? " is-hollow" : ""}" style="border-color:${progress};background:${index === 0 ? "#fff" : progress};animation-delay:${180 + index * 120}ms"></span>`,
        )
        .join("")}</div></div><div class="edd-anim__steps">${steps
        .map(
          (step, index) =>
            `<div class="edd-anim__step" style="animation-delay:${220 + index * 120}ms">${stepIcon(step, index, "edd-anim__icon")}<span class="edd-anim__label" style="color:${status}">${escapeHtml(step.title)}</span><strong class="edd-anim__date" style="color:${date}">${escapeHtml(step.date)}</strong></div>`,
        )
        .join("")}</div></div>`;
    }

    if (design === "BUBBLE") {
      const bannerIcon = headerEnabled
        ? `<span class="edd-anim__banner-icon" style="color:${theme}">${icon(headerIcon || "bag")}</span>`
        : "";
      const titleBit = titleOn ? `<span style="${titleStyle}">${escapeHtml(headingText || "Delivery Date")} </span>` : "";
      return `<div class="edd-anim edd-anim--bubble">${leadAbove}<div class="edd-anim__banner"><span>${titleBit}${range}</span>${bannerIcon}</div><div class="edd-anim__bubble-shell"><span class="edd-anim__rail edd-anim__rail--solid" style="background:${progress}" aria-hidden="true"></span><div class="edd-anim__steps">${steps
        .map(
          (step, index) =>
            `<div class="edd-anim__step" style="animation-delay:${180 + index * 110}ms"><span class="edd-anim__bubble${index === 1 ? " is-truck" : ""}" style="color:${step.color}">${step.enabled ? icon(step.icon) : ""}</span><span class="edd-anim__label" style="color:${status}">${escapeHtml(step.title)}</span><strong class="edd-anim__date" style="color:${date}">${escapeHtml(step.date)}</strong></div>`,
        )
        .join("")}</div></div></div>`;
    }

    if (design === "EXPRESS") {
      const clock = headerEnabled
        ? `<span class="edd-anim__express-clock" style="color:${theme}">${icon(headerIcon || "clock")}</span>`
        : "";
      const sub =
        showDescription && descriptionHtml
          ? `<p class="edd-anim__express-sub" style="color:${accent}" data-edd-message>${descriptionHtml}</p>`
          : `<p class="edd-anim__express-sub">Estimated Delivery Date ${range}</p>`;
      const titleBit =
        titleOn && headingText ? `<p class="edd-anim__express-title" style="${titleStyle}">${escapeHtml(headingText)}</p>` : "";
      return `<div class="edd-anim edd-anim--express"><div class="edd-anim__express-head">${clock}<div>${titleBit}${sub}</div></div><div class="edd-anim__express-shell"><span class="edd-anim__rail edd-anim__rail--solid" style="background:${progress}" aria-hidden="true"></span><div class="edd-anim__steps">${steps
        .map(
          (step, index) =>
            `<div class="edd-anim__step" style="animation-delay:${180 + index * 110}ms"><span class="edd-anim__circle${index === 1 ? " is-truck" : ""}" style="background:${progress};color:#fff">${step.enabled ? icon(step.icon) : ""}</span><span class="edd-anim__label" style="color:${status}">${escapeHtml(step.title)}</span><strong class="edd-anim__date" style="color:${date}">${escapeHtml(step.date)}</strong></div>`,
        )
        .join("")}</div></div></div>`;
    }

    if (design === "SEGMENTS") {
      return `<div class="edd-anim edd-anim--segments-wrap">${titleRow()}${leadAbove}<div class="edd-anim edd-anim--segments">${steps
        .map(
          (step, index) =>
            `<div class="edd-anim__segment" style="animation-delay:${120 + index * 100}ms">${stepIcon(step, index, "edd-anim__icon")}<span class="edd-anim__label" style="color:${status}">${escapeHtml(step.title)}</span><strong class="edd-anim__date" style="color:${date}">${escapeHtml(step.date)}</strong></div>`,
        )
        .join("")}</div></div>`;
    }

    if (design === "METER") {
      return `<div class="edd-anim edd-anim--meter">${titleRow()}${leadAbove}<div class="edd-anim__meter-track"><span class="edd-anim__meter-fill" style="background:${progress}" aria-hidden="true"></span><div class="edd-anim__steps">${steps
        .map(
          (step, index) =>
            `<div class="edd-anim__step" style="animation-delay:${160 + index * 120}ms"><span class="edd-anim__meter-dot${index === 0 ? " is-active" : ""}${index === 1 ? " is-truck" : ""}" style="border-color:${progress};background:${index === 0 ? progress : "#fff"};color:${index === 0 ? "#fff" : step.color}">${step.enabled ? icon(step.icon) : ""}</span><span class="edd-anim__label" style="color:${status}">${escapeHtml(step.title)}</span><strong class="edd-anim__date" style="color:${date}">${escapeHtml(step.date)}</strong></div>`,
        )
        .join("")}</div></div></div>`;
    }

    if (design === "BAND") {
      return `<div class="edd-anim edd-anim--band-wrap">${titleRow()}${leadAbove}<div class="edd-anim edd-anim--band" style="border-color:${progress}">${steps
        .map(
          (step, index) =>
            `<div class="edd-anim__band-step" style="animation-delay:${140 + index * 110}ms">${stepIcon(step, index, "edd-anim__icon")}<span class="edd-anim__label" style="color:${status}">${escapeHtml(step.title)}</span><strong class="edd-anim__date" style="color:${date}">${escapeHtml(step.date)}</strong></div>`,
        )
        .join("")}</div></div>`;
    }

    return "";
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
    card.style.setProperty("--edd-journey-rail", `${Math.max(2, Number(style.progressWidth) || 5)}px`);
    card.style.setProperty("--edd-font", `${fontSize}px`);
    card.style.setProperty("--edd-date-size", `${dateSize}px`);
    card.style.setProperty("--edd-status-size", `${statusSize}px`);
    card.style.setProperty("--edd-heading-weight", String(Number(style.headingFontWeight) || 600));
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
    const titleEnabled = widget.headingEnabled !== false;
    const headingWeight = Number(style.headingFontWeight) || 600;
    const headingText = heading || "Estimated Delivery Date";
    const titleStyle = `font-weight:${headingWeight}`;
    let design = String(widget.design || (widget.layout === "MINIMAL" ? "COMPACT" : "TIMELINE")).toUpperCase();
    if (isCart && (design === "COMPACT" || design === "MINIMAL")) design = "TIMELINE";
    const embeddedDescription = ["MOMENT", "EXPRESS", "BUBBLE", "SEGMENTS", "METER", "BAND"].includes(design);
    const descriptionEnabled = widget.descriptionEnabled !== false;
    const tagValues = {
      ...(delivery || {}),
      image: customImageSrc(icons.headerIcon),
    };
    const message = applyTags(widget.message, tagValues, true);
    const showDescriptionRow =
      descriptionEnabled &&
      !embeddedDescription &&
      !["BANNER", "CARD", "TRACKER", "JOURNEY"].includes(design);
    const showDescriptionAbove =
      descriptionEnabled && ["BANNER", "CARD", "TRACKER", "JOURNEY"].includes(design);
    const titleBit = titleEnabled ? `<span style="${titleStyle}">${escapeHtml(headingText)} </span>` : "";
    const classicTitle =
      titleEnabled || headerEnabled
        ? `<div class="edd-widget__title-row">${
            headerEnabled ? `<span class="edd-widget__title-icon">${icon(headerIcon)}</span>` : ""
          }${titleEnabled ? `<p class="edd-widget__heading" style="${titleStyle}">${escapeHtml(headingText)}</p>` : ""}</div>`
        : "";
    const items = widget.items || [];
    const perProduct = isCart && widget.cart?.displayMode === "PER_PRODUCT" && items.length > 0;
    const itemRows = perProduct
      ? items
          .map((item) => {
            const dates = formatCartItemDeliveryDates(item.delivery);
            // Products without a configured date show nothing (omit the row).
            if (!dates) return "";
            return `<div class="edd-widget__item"><span class="edd-widget__item-title">${escapeHtml(item.title || "")}</span><span class="edd-widget__item-dates">${escapeHtml(dates)}</span></div>`;
          })
          .join("")
      : "";
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
    const leadImage =
      headerEnabled && customImageSrc(icons.headerIcon)
        ? `<img class="edd-inline-image edd-inline-image--lead" src="${icons.headerIcon.startsWith("data:image/") ? icons.headerIcon.replace(/"/g, "") : escapeHtml(icons.headerIcon)}" alt="" />`
        : "";
    const clock = leadImage || `<span class="edd-widget__clock" aria-hidden="true">${icon("clockSolid")}</span>`;
    const descriptionRow = (withClock) =>
      `<div class="edd-widget__message-row essential-estimated-delivery-description" style="color:${style.dynamicColor || textColor};margin-bottom:${gap}px">${
        withClock ? clock : leadImage
      }<p class="edd-widget__message" data-edd-message>${message}</p></div>`;

    const headerMarkup = headerEnabled
      ? `<span class="edd-widget__banner-icon">${icon(headerIcon)}</span>`
      : "";
    const highlightMarkup = headerEnabled
      ? `<span class="edd-widget__highlight-icon">${icon(headerIcon || icons.delivered || "pin")}</span>`
      : "";
    const trackerFlag = headerEnabled
      ? `<span class="edd-widget__tracker-flag">${icon(headerIcon)}</span>`
      : "";
    const journeyFlag = headerEnabled
      ? `<span class="edd-widget__journey-flag">${icon(headerIcon)}</span>`
      : "";
    const deliveredRange = escapeHtml(delivery.deliveredLabel || delivery.delivery_from || "");
    const journeyRange = journeyRangeHtml(delivery.deliveredLabel || delivery.delivery_from || "", style.dynamicColor || textColor);
    const timeline =
      design === "BANNER"
        ? `${showDescriptionAbove ? descriptionRow(false) : ""}<div class="edd-widget__banner">${headerMarkup}<p class="edd-widget__banner-text">${titleBit}<strong>${deliveredRange}</strong></p></div>`
        : design === "CARD"
          ? `${showDescriptionAbove ? descriptionRow(false) : ""}<div class="edd-widget__highlight">${highlightMarkup}<p>${titleBit}<strong>${deliveredRange}</strong></p></div>`
          : design === "TRACKER"
            ? `${showDescriptionAbove ? descriptionRow(false) : ""}<div class="edd-widget__tracker"><div class="edd-widget__tracker-head">${trackerFlag}<p>${titleBit}<strong>${deliveredRange}</strong></p></div><div class="edd-widget__tracker-steps">${steps
                .map(
                  (step, index) =>
                    `${index ? `<span class="edd-widget__tracker-dots" aria-hidden="true"></span>` : ""}<div class="edd-widget__tracker-step">${step.enabled ? `<span class="edd-widget__tracker-icon" style="color:${step.color}">${icon(step.icon)}</span>` : `<span class="edd-widget__tracker-icon edd-widget__tracker-icon--off" aria-hidden="true"></span>`}<b style="color:${style.statusColor || textColor}">${escapeHtml(step.title)}</b><i style="color:${style.dateColor || textColor}">${escapeHtml(step.date)}</i></div>`,
                )
                .join("")}</div></div>`
          : ["MOMENT", "BUBBLE", "EXPRESS", "SEGMENTS", "METER", "BAND"].includes(design)
            ? animatedTemplateHtml({
                design,
                steps,
                headingText,
                showHeading: titleEnabled,
                headingWeight,
                deliveredRange: delivery.deliveredLabel || delivery.delivery_from || "",
                style,
                textColor,
                theme,
                progress,
                headerEnabled,
                headerIcon,
                showDescription: descriptionEnabled,
                descriptionHtml: descriptionEnabled ? message : "",
              })
          : design === "JOURNEY"
            ? `<div class="edd-widget__journey">${
                showDescriptionAbove ? descriptionRow(false) : ""
              }<div class="edd-widget__journey-head">${journeyFlag}<p>${titleBit}${journeyRange}</p></div><div class="edd-widget__journey-shell"><div class="edd-widget__journey-steps">${steps
                .map(
                  (step, index) =>
                    `<div class="edd-widget__journey-step" style="animation-delay:${180 + index * 100}ms">${step.enabled ? `<span class="edd-widget__journey-icon${index === 1 ? " edd-widget__journey-icon--truck" : ""}" style="color:${step.color}">${icon(step.icon)}</span>` : `<span class="edd-widget__journey-icon edd-widget__journey-icon--off" aria-hidden="true"></span>`}<span class="edd-widget__journey-label" style="color:${style.statusColor || textColor}">${escapeHtml(step.title)}</span><strong class="edd-widget__journey-date" style="color:${style.dateColor || textColor}">${escapeHtml(step.date)}</strong></div>`,
                )
                .join("")}</div></div></div>`
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
      ${!["BANNER", "CARD", "TRACKER", "JOURNEY", "MOMENT", "BUBBLE", "EXPRESS", "SEGMENTS", "METER", "BAND"].includes(design) ? classicTitle : ""}
      ${directWeight}
      ${showDescriptionRow ? descriptionRow(true) : ""}
      ${timeline}
      ${
        perProduct && itemRows
          ? `<div class="edd-widget__items">${itemRows}</div>`
          : ""
      }
    `;
  }

  function pincodeStatus(pincode) {
    if (pincode.available === false) return pincode.message || "Delivery unavailable";
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
    const tone = pincode.available === false ? "error" : "";
    const statusText = pincodeStatus(pincode);
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
        <p class="edd-check__status" data-edd-pincode-status ${tone ? `data-tone="${tone}"` : ""}${statusText ? "" : " hidden"}>${escapeHtml(statusText)}</p>
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
      if (messageEl) {
        const tagValues = {
          ...payload.widget.delivery,
          image: customImageSrc(payload.widget.icons?.headerIcon),
        };
        messageEl.innerHTML = applyTags(payload.widget.message, tagValues, true);
      }
    }, 1000);
  }

  function track(root, body) {
    const url = proxyUrl(root.dataset.eventsUrl, "/apps/delivery-date/events");
    const params = new URLSearchParams();
    params.set("widgetId", body.widgetId);
    params.set("type", body.type);
    const productId = compactResourceIds(body.productId) || String(body.productId || "").trim();
    if (productId) params.set("productId", productId.slice(0, 128));
    // GET with query params - Shopify app proxy often drops POST bodies.
    // Fall back to POST / beacon via sendProxy auto mode.
    return sendProxy(url, params).catch((error) => {
      if (window.Shopify?.designMode || /[?&]edd_debug=1(?:&|$)/.test(window.location.search)) {
        console.warn("[edd] event failed", body.type, error?.message || error);
      }
      return null;
    });
  }

  function bindTracking(root, payload) {
    const widgetId = payload.widget?.id;
    if (!widgetId || root.dataset.eddTracked) return;
    root.dataset.eddTracked = "true";
    const eventBody = { widgetId, productId: root.dataset.productId };
    // Record after paint so the proxy request isn't racing initial page work.
    const sendImpression = () => track(root, { ...eventBody, type: "IMPRESSION" });
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => {
        window.setTimeout(sendImpression, 0);
      });
    } else {
      window.setTimeout(sendImpression, 50);
    }

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
        status.hidden = false;
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
          nextStatus.hidden = false;
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
      // Cart payloads include cartItems JSON - prefer POST so long carts don't fail GET/proxy URL limits.
      let response =
        location === "CART"
          ? null
          : await fetch(requestUrl, {
              credentials: "same-origin",
              cache: "no-store",
              headers: { Accept: "application/json" },
            });
      if (!response?.ok || location === "CART") {
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
        delete root.dataset.eddReady;
        hideRoot(root);
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!payload.widget) {
        delete root.dataset.eddReady;
        hideRoot(root);
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
      delete root.dataset.eddReady;
      hideRoot(root);
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

  function shouldAutoPlaceProductRoot(root) {
    // Section app blocks are already where the merchant placed them.
    // Only reposition body-level embed roots.
    if (
      root.closest(
        ".product__info-container, .product__info, .product-information, .product-form, product-info, .product-single__meta, buy-buttons, .product__blocks, .product-blocks",
      )
    ) {
      return false;
    }
    return true;
  }

  function placeProductRoot(root, position) {
    if ((root.dataset.location || "") !== "PRODUCT" || !isProductPage()) return;
    if (!shouldAutoPlaceProductRoot(root)) {
      root.dataset.eddPlaced = "SECTION";
      return;
    }

    const key =
      position === "ABOVE_ATC" || position === "PRODUCT_INFO" || position === "BELOW_ATC"
        ? position
        : "BELOW_ATC";
    if (root.dataset.eddPlaced === key) return;

    const node = movableNode(root);
    const atc = firstMatch([
      'form[action*="/cart/add"] button[type="submit"]',
      'form[action*="/cart/add"] button[name="add"]',
      'button[name="add"]',
      'form[action*="/cart/add"] [type="submit"]',
      ".product-form__submit",
      ".product-form__cart-submit",
      "button.product-form__cart-submit",
      ".product-form__buttons button[type='submit']",
      ".product-form__buttons",
      "[data-add-to-cart]",
      "buy-buttons",
      ".shopify-payment-button",
    ]);
    const info = firstMatch([
      ".product__info-container",
      ".product__info",
      ".product-information",
      ".product-single__meta",
      ".product__title",
      "h1.product-title",
      "h1.product__title",
      ".product__description",
    ]);

    let placed = false;
    if (key === "PRODUCT_INFO" && info) {
      info.after(node);
      placed = true;
    } else if (atc) {
      const mount = atc.closest(".product-form__buttons") || atc.parentElement || atc;
      if (key === "ABOVE_ATC") {
        mount.parentElement ? mount.parentElement.insertBefore(node, mount) : mount.before(node);
      } else {
        mount.after(node);
      }
      placed = true;
    } else if (info) {
      info.append(node);
      placed = true;
    }

    if (placed) root.dataset.eddPlaced = key;
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
