export function BackButton({ onClick, children = "Back" }) {
  return (
    <button type="button" className="edd-editor__back" onClick={onClick}>
      <span className="edd-editor__back-glyph" aria-hidden="true">
        <svg viewBox="0 0 20 20" width="14" height="14">
          <path
            d="M12.25 4.5 6.75 10l5.5 5.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {children}
    </button>
  );
}
