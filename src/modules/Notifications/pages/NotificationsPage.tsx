import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import { Pagination } from "../../../components/ui/pagination/Pagination";
import { useToast } from "../../../hooks/useToast";
import {
  notificationService,
  type NotificationItem,
} from "../../../services/notificationService";

const categoryStyles: Record<NotificationItem["category"], string> = {
  Lead: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
  Meeting: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Follow-up": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  System: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

const categoryDot: Record<NotificationItem["category"], string> = {
  Lead: "bg-brand-500",
  Meeting: "bg-blue-500",
  "Follow-up": "bg-amber-500",
  System: "bg-purple-500",
};

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      return (err.response?.data as { message?: string } | undefined)?.message || fallback;
    }
    return fallback;
  };

  const fetchNotifications = async (page = currentPage, limit = rowsPerPage) => {
    setLoading(true);
    try {
      const response = await notificationService.getNotifications({ page, limit });
      const meta = response.data?.meta;
      setNotifications(response.data?.data ?? []);
      setTotal(meta?.total ?? 0);
      setUnreadCount(meta?.unreadCount ?? 0);
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to load notifications."), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchNotifications(page, rowsPerPage);
  };

  const handleRowsPerPageChange = (rows: number) => {
    setRowsPerPage(rows);
    setCurrentPage(1);
    fetchNotifications(1, rows);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      setUnreadCount(0);
      showToast("All notifications marked as read.", "success");
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to mark notifications as read."), "error");
    } finally {
      setMarkingAll(false);
    }
  };

  const startIndex = (currentPage - 1) * rowsPerPage;

  const notificationRows = useMemo(() => notifications, [notifications]);

  return (
    <>
      <PageMeta
        title="Notifications | SaiFlow"
        description="View all notification activity in SaiFlow."
      />
      <PageBreadcrumb pageTitle="Notifications" />

      {/* Header card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 mb-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white flex items-center gap-2">
              All Notifications
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {total} total · {unreadCount} unread
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="inline-flex items-center justify-center rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-500 hover:bg-brand-500 hover:text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05]">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50">
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">#</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">Category</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">Notification</th>
                <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 dark:text-gray-400">Time</th>
                <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading notifications...
                  </td>
                </tr>
              ) : notificationRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No notifications yet.
                  </td>
                </tr>
              ) : (
                notificationRows.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                      {startIndex + index + 1}
                    </td>
                    <td className="px-4 py-3 text-start">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${categoryStyles[item.category]}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${categoryDot[item.category]}`}></span>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-start text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium text-gray-800 dark:text-white/90">{item.userName}</span>{" "}
                      {item.message}{" "}
                      <span className="font-medium text-gray-800 dark:text-white/90">{item.targetName}</span>
                    </td>
                    <td className="px-4 py-3 text-start text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {item.time}
                    </td>
                    <td className="px-4 py-3 text-end text-xs">
                      {item.unread ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-orange-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                          Unread
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-gray-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                          Read
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="mt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={total}
              rowsPerPage={rowsPerPage}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              itemName="notifications"
            />
          </div>
        )}
      </div>
    </>
  );
}
