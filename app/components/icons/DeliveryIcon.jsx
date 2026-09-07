import { ANIMATED_ICON_MAP } from "../../lib/constants";

const ICONS = {
  package: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 8.5 12 4l9 4.5v9L12 22 3 17.5v-9Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 22V13M3 8.5 12 13l9-4.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  box: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="7" width="16" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 11h16M12 7v13" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 7 12 4l4 3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 8h10v9H3V8Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13 11h4.2L20 14.2V17h-7v-6Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="7" cy="18.2" r="1.6" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="16.5" cy="18.2" r="1.6" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  clockSolid: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M12 6.8v5.5l3.7 2.2" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 4v4M16 4v4M4 10h16" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m4 11 8-7 8 7v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s6.5-5.8 6.5-11A6.5 6.5 0 1 0 5.5 10c0 5.2 6.5 11 6.5 11Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.1" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  bag: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6.2 8.2h11.6l-1 12.3H7.2l-1-12.3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 8.2V7.1a3 3 0 0 1 6 0v1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  flag: (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 20V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 5h13l-2.4 3.6L19 12.2H6V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  ),
};

export function DeliveryIcon({ name, color }) {
  const value = String(name || "").trim();
  const src = /^(https?:\/\/|data:image\/|blob:|\/\/)/i.test(value) ? value : "";
  if (src) {
    return (
      <span className="edd-icon edd-icon--image" style={{ color }}>
        <img key={src} src={src} alt="" />
      </span>
    );
  }

  const animated = ANIMATED_ICON_MAP[value];
  if (animated) {
    return (
      <span
        className={`edd-icon edd-icon--anim edd-icon--${animated.motion}`}
        style={{ color }}
        data-motion={animated.motion}
      >
        {ICONS[animated.base] || ICONS.package}
      </span>
    );
  }

  return (
    <span className="edd-icon" style={{ color }}>
      {ICONS[value] || ICONS.package}
    </span>
  );
}

export { ICONS };
