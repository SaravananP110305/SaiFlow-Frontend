import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermission?: {
    module: string;
    action: string;
  };
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermission,
}: ProtectedRouteProps) {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-boxdark">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission.module, requiredPermission.action)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role?.name)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
