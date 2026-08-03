import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import { EyeCloseIcon, EyeIcon } from "../icons";
import { useToast } from "../hooks/useToast";
import { authService } from "../services/authService";
import { useAuth } from "../context/AuthContext";

interface ChangePasswordFormValues {
  currentPass: string;
  newPass: string;
  confirmPass: string;
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { logout } = useAuth();

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormValues>({
    defaultValues: {
      currentPass: "",
      newPass: "",
      confirmPass: "",
    },
    mode: "onChange",
  });

  const newPassValue = watch("newPass");

  const handleSave = async (values: ChangePasswordFormValues) => {
    clearErrors();

    try {
      await authService.changePassword({
        oldPassword: values.currentPass,
        newPassword: values.newPass,
      });
      showToast("Password changed successfully.", "success");
      reset();
      try {
        await logout();
      } catch (logoutError) {
        // The password endpoint already invalidates the refresh session.
      }
      navigate("/signin", { replace: true });
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to change password.";

      if (message.includes("Current password")) {
        setError("currentPass", { type: "server", message });
      }

      if (message.includes("New password")) {
        setError("newPass", { type: "server", message });
      }

      showToast(message, "error");
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <>
      <PageMeta
        title="Change Password | SaiFlow"
        description="Change your account password in SaiFlow CRM."
      />
      <PageBreadcrumb pageTitle="Change password" />

      <div className="mx-auto w-full max-w-[700px]">
        <form
          onSubmit={handleSubmit(handleSave)}
          className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] p-6 shadow-theme-xs"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-6 pb-2 border-b border-gray-100 dark:border-white/[0.05]">
            Password details
          </h3>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Current Password */}
            <div className="sm:col-span-2">
              <Label htmlFor="currentPass">
                Current password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Controller
                  name="currentPass"
                  control={control}
                  rules={{
                    required: "Current password is required",
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="currentPass"
                      type={showCurrentPass ? "text" : "password"}
                      placeholder="Enter current password"
                      className={errors.currentPass ? "border-error-500 focus:ring-error-500/10" : ""}
                    />
                  )}
                />
                <span
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                >
                  {showCurrentPass ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  )}
                </span>
              </div>
              {errors.currentPass && (
                <span className="mt-1.5 text-xs text-error-600 block">{errors.currentPass.message}</span>
              )}
            </div>

            {/* New Password */}
            <div>
              <Label htmlFor="newPass">
                New password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Controller
                  name="newPass"
                  control={control}
                  rules={{
                    required: "New password is required",
                    minLength: {
                      value: 6,
                      message: "New password must be at least 6 characters long",
                    },
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="newPass"
                      type={showNewPass ? "text" : "password"}
                      placeholder="Enter new password"
                      className={errors.newPass ? "border-error-500 focus:ring-error-500/10" : ""}
                    />
                  )}
                />
                <span
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                >
                  {showNewPass ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  )}
                </span>
              </div>
              {errors.newPass && (
                <span className="mt-1.5 text-xs text-error-600 block leading-tight">{errors.newPass.message}</span>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirmPass">
                Confirm new password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Controller
                  name="confirmPass"
                  control={control}
                  rules={{
                    required: "Please confirm your new password",
                    validate: (value) =>
                      value === newPassValue || "Passwords do not match",
                  }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="confirmPass"
                      type={showConfirmPass ? "text" : "password"}
                      placeholder="Confirm new password"
                      className={errors.confirmPass ? "border-error-500 focus:ring-error-500/10" : ""}
                    />
                  )}
                />
                <span
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                >
                  {showConfirmPass ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  )}
                </span>
              </div>
              {errors.confirmPass && (
                <span className="mt-1.5 text-xs text-error-600 block">{errors.confirmPass.message}</span>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-white/[0.05]">
            <Button size="sm" variant="outline" onClick={handleCancel} type="button">
              Cancel
            </Button>
            <Button size="sm" type="submit">
              Save
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
