export function pageList(totalPages, currentPage) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

export function compareValues(left, right, sortDir = "asc") {
  let result = 0;
  if (typeof left === "number" && typeof right === "number") {
    result = left - right;
  } else {
    result = String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }
  return sortDir === "asc" ? result : -result;
}

export function SortableHeader({ column, sortKey, sortDir, onSort }) {
  if (column.sortable === false) {
    return (
      <s-table-header listSlot={column.listSlot} {...(column.format ? { format: column.format } : {})}>
        {column.label}
      </s-table-header>
    );
  }

  const active = sortKey === column.key;
  const ariaSort = active ? (sortDir === "asc" ? "ascending" : "descending") : "none";
  return (
    <s-table-header
      listSlot={column.listSlot}
      {...(column.format ? { format: column.format } : {})}
      aria-sort={ariaSort}
    >
      <button
        type="button"
        className={`edd-table-sort${active ? " edd-table-sort--active" : ""}`}
        onClick={() => onSort(column.key)}
        aria-label={`Sort by ${column.label}${active ? `, ${sortDir === "asc" ? "ascending" : "descending"}` : ""}`}
      >
        <span>{column.label}</span>
        <span className="edd-table-sort__icon" aria-hidden="true">
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </s-table-header>
  );
}

export function TablePagination({ page, totalPages, onPageChange, label }) {
  const pages = pageList(totalPages, page);
  return (
    <nav className="edd-table-pagination" aria-label={label}>
      <button
        type="button"
        className="edd-btn edd-table-pagination__nav"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
      >
        Previous
      </button>
      <div className="edd-table-pagination__pages">
        {pages.map((pageNumber, index) => {
          const previous = pages[index - 1];
          const gap = previous != null && pageNumber - previous > 1;
          return (
            <span key={pageNumber} className="edd-table-pagination__page-wrap">
              {gap ? <span className="edd-table-pagination__ellipsis">…</span> : null}
              <button
                type="button"
                className={`edd-table-pagination__page${
                  pageNumber === page ? " edd-table-pagination__page--active" : ""
                }`}
                aria-current={pageNumber === page ? "page" : undefined}
                onClick={() => onPageChange(pageNumber)}
              >
                {pageNumber}
              </button>
            </span>
          );
        })}
      </div>
      <button
        type="button"
        className="edd-btn edd-table-pagination__nav"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
      >
        Next
      </button>
    </nav>
  );
}
