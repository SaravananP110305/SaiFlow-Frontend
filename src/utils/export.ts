// CSV & Excel Export utility for SaiFlow CRM

import * as XLSX from "xlsx";

/**
 * Improved CSV export with proper date suffix and BOM for Excel compatibility.
 */
export function exportToCSV(
  data: any[],
  headers: string[],
  filename: string
): void {
  if (!data || data.length === 0) return;

  try {
    const csvRows: string[] = [];

    // 1. Add BOM for UTF-8 encoding (Excel compatibility)
    const BOM = "\uFEFF";

    // 2. Add header row
    csvRows.push(
      headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",")
    );

    // 3. Add data rows
    for (const item of data) {
      const rowValues = Object.keys(item).map((key) => {
        // Format dates nicely
        const value = item[key];
        if (value instanceof Date) {
          return `"${value.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}"`;
        }
        const stringVal =
          value === null || value === undefined ? "" : String(value);
        return `"${stringVal.replace(/"/g, '""')}"`;
      });
      csvRows.push(rowValues.join(","));
    }

    // 4. Create download trigger
    const blob = new Blob([BOM + csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename}_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error generating CSV export:", error);
  }
}

/**
 * Export data to a properly formatted Excel (.xlsx) file.
 * Features:
 * - Bold headers with brand color fill
 * - Auto-sized column widths
 * - Currency formatting for number fields
 * - Date formatting for date fields
 * - Proper sheet naming
 */
export function exportToExcel(
  data: Record<string, any>[],
  columnHeaders: string[],
  columnKeys: string[],
  filename: string,
  sheetName: string = "Sheet1"
): void {
  if (!data || data.length === 0) return;

  try {
    // Build worksheet data array (header + rows)
    const wsData: any[][] = [columnHeaders];

    data.forEach((item) => {
      const row: any[] = columnKeys.map((key) => {
        const value = item[key];
        // Handle undefined/null
        if (value === null || value === undefined) return "";
        // Handle currency numbers (store as string to avoid scientific notation)
        if (typeof value === "number" && key.toLowerCase().includes("amount") || key.toLowerCase().includes("price") || key.toLowerCase().includes("total") || key.toLowerCase().includes("credit") || key.toLowerCase().includes("limit")) {
          return value;
        }
        // Handle dates (convert to readable string)
        if (key.toLowerCase().includes("date") || key.toLowerCase().includes("since") || key.toLowerCase().includes("created") || key.toLowerCase().includes("updated")) {
          if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            return new Date(value).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
          }
        }
        return String(value);
      });
      wsData.push(row);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto-fit column widths
    const colWidths = columnHeaders.map((header, idx) => {
      let maxLen = header.length;
      wsData.forEach((row) => {
        const cell = String(row[idx] || "");
        const len = cell.length;
        if (len > maxLen) maxLen = len;
      });
      return { wch: Math.min(maxLen + 3, 50) };
    });
    ws["!cols"] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate and download
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
  } catch (error) {
    console.error("Error generating Excel export:", error);
  }
}

/**
 * Format currency for USD display
 */
export function formatCurrencyUSD(amount: number): string {
  return "₹" + amount.toLocaleString("en-IN");
}

/**
 * Format currency for INR display
 */
export function formatCurrencyINR(amount: number): string {
  if (amount >= 10000000) {
    return "₹" + (amount / 10000000).toFixed(2) + " Cr";
  } else if (amount >= 100000) {
    return "₹" + (amount / 100000).toFixed(2) + " L";
  }
  return "₹" + amount.toLocaleString("en-IN");
}
