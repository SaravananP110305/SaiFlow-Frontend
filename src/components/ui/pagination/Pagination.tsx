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

  return (
    <div className="flex flex-col items-center justify-between gap-4 p-5 border-t border-gray-100 dark:border-gray-800 md:flex-row w-full">
      {/* Left Section: Show Dropdown + Showing Stats */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 whitespace-nowrap dark:text-gray-400">
            Show:
          </span>
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center justify-between h-11 w-20 rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 cursor-pointer dropdown-toggle hover:bg-gray-50 dark:hover:bg-white/5"
            >
              <span>{rowsPerPage}</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            </button>
            <Dropdown
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              className="w-20 p-1"
              style={{ bottom: "100%", top: "auto", marginTop: "0", marginBottom: "8px", left: "0", right: "auto" }}
            >
              <ul className="flex flex-col gap-0.5">
                {[5, 10, 20].map((size) => (
                  <li key={size}>
                    <DropdownItem
                      onItemClick={() => {
                        onRowsPerPageChange(size);
                        setIsOpen(false);
                      }}
                      className={`cursor-pointer rounded-lg text-center w-full px-3 py-2 text-sm ${
                        rowsPerPage === size
                          ? "bg-brand-50 text-brand-500 font-medium dark:bg-brand-500/15 dark:text-brand-400"
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

        <span className="text-sm text-gray-500 dark:text-gray-400">
          Showing {totalItems === 0 ? 0 : startIdx + 1} to{" "}
          {Math.min(endIdx, totalItems)} of {totalItems} {itemName}
        </span>
      </div>

      {/* Right Section: Previous 1 2 3 Next controls */}
      {totalPages > 0 && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="h-9 py-0 px-3 text-xs"
          >
            Previous
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition cursor-pointer ${
                    currentPage === page
                      ? "bg-[#ff3951] text-white"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  {page}
                </button>
              )
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-9 py-0 px-3 text-xs"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};
