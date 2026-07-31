import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm, Controller } from "react-hook-form";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { getStorage, setStorage } from "../../../utils/storage";
import { useToast } from "../../../hooks/useToast";
import { DEPARTMENTS } from "../../Master/data/masterData";


interface User {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: "Active" | "Inactive";
  password?: string;
}

interface UserFormValues {
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  password?: string;
  confirmPassword?: string;
}

const availableRoles = [
  "Administrator",
  "Business Development Manager",
  "Business Development Executive",
  "Presales Consultant",
  "Guest User",
];

interface AddEditUserPageProps {
  mode: "create" | "edit" | "view";
}

export default function AddEditUserPage({ mode }: AddEditUserPageProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const departmentOptions = useMemo(() => {
    return getStorage("saiflow_master_departments", DEPARTMENTS)
      .filter((x: any) => x.status === "Active")
      .map((x: any) => ({ value: x.name, label: x.name }));
  }, []);

  const generateEmployeeId = (id: number): string => {
    return `EMP-${String(id).padStart(3, "0")}`;
  };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    mode: "onChange",
    defaultValues: {
      employeeId: "",
      name: "",
      email: "",
      phone: "",
      role: "",
      department: "",
      password: "",
      confirmPassword: "",
    },
  });

  const watchPassword = watch("password");

  useEffect(() => {
    const users = getStorage<User[]>("saiflow_users", []);
    if (mode !== "create") {
      const found = users.find((u) => String(u.id) === String(id));
      if (found) {
        setUser(found);
        reset({
          employeeId: found.employeeId,
          name: found.name,
          email: found.email,
          phone: found.phone.replace(/\D/g, "").slice(-10),
          role: found.role,
          department: found.department || "",
        });
      } else {
        showToast("User not found.", "error");
        navigate("/users");
        return;
      }
    } else {
      const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      reset({
        employeeId: generateEmployeeId(nextId),
        name: "",
        email: "",
        phone: "",
        role: "",
        department: "",
        password: "",
        confirmPassword: "",
      });
    }
    setLoading(false);
  }, [id, mode, reset, navigate, showToast]);

  const handleSave = (data: UserFormValues) => {
    if (mode === "view") return;
    const users = getStorage<User[]>("saiflow_users", []);

    if (mode === "create") {
      const newId = users.length > 0 ? Math.max(...users.map((u) => u.id)) + 1 : 1;
      const newUser: User = {
        id: newId,
        employeeId: generateEmployeeId(newId),
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        role: data.role,
        department: data.department,
        status: "Active",
        password: data.password?.trim() || "Password@123",
      };
      const updated = [...users, newUser];
      setStorage("saiflow_users", updated);
      showToast("User created successfully.", "success");
    } else if (mode === "edit" && user) {
      const updated = users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              name: data.name.trim(),
              email: data.email.trim(),
              phone: data.phone.trim(),
              role: data.role,
              department: data.department,
            }
          : u
      );
      setStorage("saiflow_users", updated);
      showToast("User updated successfully.", "success");
    }
    navigate("/users");
  };

  const handleFormError = () => {
    showToast("Please fill all required fields.", "error");
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Loading details...</div>;
  }

  const pageTitle =
    mode === "create"
      ? "Add user"
      : mode === "edit"
        ? "Edit user"
        : "View user";

  return (
    <>
      <PageMeta
        title={`${pageTitle} | SaiFlow`}
        description="Manage employee accounts in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle={pageTitle} />

      <div className="space-y-6 w-full">
        <form onSubmit={handleSubmit(handleSave, handleFormError)} className="space-y-6">
          {/* Section: Basic Information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-white/95 mb-4 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
              User details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee ID */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Employee ID <span className="text-error-500">*</span>
                </label>
                <Controller
                  name="employeeId"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="text"
                      placeholder="Auto-generated"
                      disabled={true}
                      className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    />
                  )}
                />
              </div>

              {/* Employee name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Employee name <span className="text-error-500">*</span>
                </label>
                <Controller
                  name="name"
                  control={control}
                  rules={{
                    required: "Name is required",
                    pattern: {
                      value: /^[a-zA-Z\s]+$/,
                      message: "Letters and spaces only",
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="text"
                      placeholder="Enter employee name"
                      disabled={mode === "view"}
                      className={errors.name ? "border-error-500" : ""}
                    />
                  )}
                />
                {errors.name && (
                  <span className="mt-1.5 text-xs text-error-600 block">{errors.name.message}</span>
                )}
              </div>

              {/* Department */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department
                </label>
                <Controller
                  name="department"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      options={departmentOptions}
                      placeholder="Select department"
                      defaultValue={value}
                      disabled={mode === "view"}
                      onChange={onChange}
                    />
                  )}
                />
              </div>

              {/* User role */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  User role <span className="text-error-500">*</span>
                </label>
                <Controller
                  name="role"
                  control={control}
                  rules={{ required: "User role is required" }}
                  render={({ field: { value, onChange } }) => (
                    <Select
                      options={availableRoles.map((r) => ({ value: r, label: r }))}
                      placeholder="Select role"
                      defaultValue={value}
                      disabled={mode === "view"}
                      onChange={onChange}
                    />
                  )}
                />
                {errors.role && (
                  <span className="mt-1.5 text-xs text-error-600 block">{errors.role.message}</span>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address <span className="text-error-500">*</span>
                </label>
                <Controller
                  name="email"
                  control={control}
                  rules={{
                    required: "Email is required",
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: "Please enter a valid email address.",
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter email address"
                      disabled={mode === "view"}
                      className={errors.email ? "border-error-500" : ""}
                    />
                  )}
                />
                {errors.email && (
                  <span className="mt-1.5 text-xs text-error-600 block">{errors.email.message}</span>
                )}
              </div>

              {/* Password (only for create mode) */}
              {mode === "create" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="password"
                    control={control}
                    rules={{
                      required: "Password is required",
                      minLength: {
                        value: 6,
                        message: "Password must be at least 6 characters long",
                      },
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="password"
                        placeholder="Enter password"
                        className={errors.password ? "border-error-500" : ""}
                      />
                    )}
                  />
                  {errors.password && (
                    <span className="mt-1.5 text-xs text-error-600 block">{errors.password.message}</span>
                  )}
                </div>
              )}

              {/* Confirm Password (only for create mode) */}
              {mode === "create" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confirm password <span className="text-error-500">*</span>
                  </label>
                  <Controller
                    name="confirmPassword"
                    control={control}
                    rules={{
                      required: "Please confirm your password",
                      validate: (value) =>
                        value === watchPassword || "Passwords do not match",
                    }}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="password"
                        placeholder="Re-enter password"
                        className={errors.confirmPassword ? "border-error-500" : ""}
                      />
                    )}
                  />
                  {errors.confirmPassword && (
                    <span className="mt-1.5 text-xs text-error-600 block">{errors.confirmPassword.message}</span>
                  )}
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone number <span className="text-error-500">*</span>
                </label>
                <Controller
                  name="phone"
                  control={control}
                  rules={{
                    required: "Phone number is required",
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: "Please enter a valid 10-digit mobile number starting with 6-9.",
                    },
                  }}
                  render={({ field: { value, onChange, ...rest } }) => (
                    <Input
                      {...rest}
                      value={value}
                      type="text"
                      placeholder="Enter 10-digit phone number"
                      maxLength={10}
                      disabled={mode === "view"}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        onChange(digits);
                      }}
                      className={errors.phone ? "border-error-500" : ""}
                    />
                  )}
                />
                {errors.phone && (
                  <span className="mt-1.5 text-xs text-error-600 block">{errors.phone.message}</span>
                )}
              </div>

            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
            <Button size="sm" type="button" variant="outline" onClick={() => navigate("/users")}>
              {mode === "view" ? "Back to list" : "Cancel"}
            </Button>
            {mode !== "view" && (
              <Button size="sm" type="submit">
                Save
              </Button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
