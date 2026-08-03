import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm, Controller } from "react-hook-form";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import Button from "../../../components/ui/button/Button";
import Input from "../../../components/form/input/InputField";
import Select from "../../../components/form/Select";
import { getStorage } from "../../../utils/storage";
import { useToast } from "../../../hooks/useToast";
import { DEPARTMENTS } from "../../Master/data/masterData";
import { userService } from "../../../services/userService";
import { roleService } from "../../../services/roleService";

interface User {
  id: number;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: number;
  status: "ACTIVE" | "INACTIVE";
  role?: {
    id: number;
    name: string;
    description: string;
  };
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

interface AddEditUserPageProps {
  mode: "create" | "edit" | "view";
}

export default function AddEditUserPage({ mode }: AddEditUserPageProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<any[]>([]);

  const departmentOptions = useMemo(() => {
    return getStorage("saiflow_master_departments", DEPARTMENTS)
      .filter((x: any) => x.status === "Active")
      .map((x: any) => ({ value: x.name, label: x.name }));
  }, []);

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
    async function loadData() {
      setLoading(true);
      try {
        // Fetch active system roles
        const rolesRes = await roleService.getRoles({ paginate: true });
        const fetchedRoles = rolesRes.data || [];
        setRoles(fetchedRoles);

        if (mode !== "create" && id) {
          const userRes = await userService.getUserById(Number(id));
          if (userRes) {
            setUser(userRes);
            const name = `${userRes.firstName} ${userRes.lastName}`.trim();
            reset({
              employeeId: `EMP-${String(userRes.id).padStart(3, "0")}`,
              name,
              email: userRes.email,
              phone: userRes.phone || "",
              role: String(userRes.roleId),
              department: userRes.role?.description || "",
            });
          } else {
            showToast("User not found.", "error");
            navigate("/users");
          }
        } else {
          reset({
            employeeId: "Auto-generated",
            name: "",
            email: "",
            phone: "",
            role: "",
            department: "",
            password: "",
            confirmPassword: "",
          });
        }
      } catch (err) {
        showToast("Failed to load user or role data from server.", "error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, mode, reset, navigate, showToast]);

  const handleSave = async (data: UserFormValues) => {
    if (mode === "view") return;

    const parts = data.name.trim().split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || "User";

    const payload = {
      firstName,
      lastName,
      email: data.email.trim(),
      phone: data.phone.trim(),
      roleId: Number(data.role),
      status: "ACTIVE"
    };

    try {
      if (mode === "create") {
        await userService.createUser({
          ...payload,
          password: data.password || "Password@123"
        });
        showToast("User created successfully.", "success");
      } else if (mode === "edit" && user) {
        await userService.updateUser(user.id, payload);
        showToast("User updated successfully.", "success");
      }
      navigate("/users");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to save user details.", "error");
    }
  };

  const handleFormError = () => {
    showToast("Please fill all required fields correctly.", "error");
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
                      disabled={true}
                      placeholder="Auto-generated upon save"
                    />
                  )}
                />
              </div>

              {/* Name */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full name <span className="text-error-500">*</span>
                </label>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: "Full name is required" }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="text"
                      placeholder="Enter full name"
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
                      options={roles.map((r) => ({ value: String(r.id), label: r.name }))}
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
