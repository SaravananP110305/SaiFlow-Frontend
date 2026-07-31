import React, { useState } from "react";
import Button from "../button/Button";
import { Dropdown } from "../dropdown/Dropdown";
import { DropdownItem } from "../dropdown/DropdownItem";
import { ChevronDownIcon } from "../../../icons";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  itemName?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  itemName = "items",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;

  // Helper to generate page numbers with ellipsis for large datasets
  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    const maxVisiblePages = 7;
    if (total <= maxVisiblePages) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    if (current <= 4) {
      // Near start: 1, 2, 3, 4, 5, ..., total
      for (let i = 1; i <= 5; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(total);
    } else if (current >= total - 3) {
      // Near end: 1, ..., total-4, total-3, total-2, total-1, total
      pages.push(1);
      pages.push("...");
      for (let i = total - 4; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // In middle: 1, ..., current-1, current, current+1, ..., total
      pages.push(1);
      pages.push("...");
      pages.push(current - 1);
      pages.push(current);
      pages.push(current + 1);
      pages.push("...");
      pages.push(total);
    }

    return pages;
  };

  const pageSizes = Array.from(
    new Set([5, 10, 20, 50, 100, rowsPerPage])
  ).sort((a, b) => a - b);

  return (
    <div className="flex flex-col items-center justify-between gap-4 p-4 border-t border-gray-100 dark:border-gray-800 md:flex-row w-full">
      {/* Left Section: Show Dropdown + Showing Stats */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap dark:text-gray-400">
            Show:
          </span>
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between h-9 w-20 rounded-lg border border-gray-200 bg-transparent px-3 py-1.5 text-xs font-medium text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span>{rowsPerPage}</span>
              <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <Dropdown
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              className="w-20 p-1"
              style={{
                bottom: "100%",
                top: "auto",
                marginTop: "0",
                marginBottom: "8px",
                left: "0",
                right: "auto",
              }}
            >
              <ul className="flex flex-col gap-0.5">
                {pageSizes.map((size) => (
                  <li key={size}>
                    <DropdownItem
                      onItemClick={() => {
                        onRowsPerPageChange(size);
                        setIsOpen(false);
                      }}
                      className={`cursor-pointer rounded-lg text-center w-full px-3 py-1.5 text-xs ${
                        rowsPerPage === size
                          ? "bg-brand-50 text-brand-500 font-semibold dark:bg-brand-500/15 dark:text-brand-400"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                      }`}
                    >
                      {size}
                    </DropdownItem>
                  </li>
                ))}
              </ul>
            </Dropdown>
          </div>
        </div>

        <span className="text-xs text-gray-500 dark:text-gray-400">
          Showing {totalItems === 0 ? 0 : startIdx + 1} to{" "}
          {Math.min(endIdx, totalItems)} of {totalItems} {itemName}
        </span>
      </div>

      {/* Right Section: Previous 1 2 3 ... 19 Next controls */}
      {totalPages > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="h-8 py-0 px-3 text-xs"
          >
            Previous
          </Button>

          <div className="flex flex-wrap items-center gap-1">
            {getPageNumbers(currentPage, totalPages).map((page, index) => {
              if (typeof page === "string") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex items-center justify-center min-w-[32px] h-8 text-xs font-semibold text-gray-400 dark:text-gray-500 select-none px-1"
                  >
                    •••
                  </span>
                );
              }

              const isCurrent = currentPage === page;

              return (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`flex items-center justify-center min-w-[32px] h-8 px-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isCurrent
                      ? "bg-[#ff3951] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-8 py-0 px-3 text-xs"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
