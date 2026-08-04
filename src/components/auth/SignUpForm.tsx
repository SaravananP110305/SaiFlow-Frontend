import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useToast } from "../../hooks/useToast";

interface SignUpFormValues {
  fname: string;
  lname: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignUpForm() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    mode: "onChange",
    defaultValues: {
      fname: "",
      lname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password");



  const onSubmit = () => {
    showToast("User created successfully.", "success");
    navigate("/signin");
  };

  const onError = () => {
    showToast("Please fix the form errors before submitting.", "error");
  };

  return (
    <div className="flex flex-col justify-center flex-1 w-full max-w-md px-6 mx-auto overflow-y-auto lg:px-0 no-scrollbar">
      <div className="mb-8">
        <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
          Create Account
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Fill in the details below to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* First Name */}
            <div>
              <Label>
                First Name <span className="text-error-500">*</span>
              </Label>
              <Controller
                name="fname"
                control={control}
                rules={{
                  required: "First name is required",
                  minLength: {
                    value: 2,
                    message: "First name must be at least 2 characters",
                  },
                  maxLength: {
                    value: 50,
                    message: "First name must be at most 50 characters",
                  },
                  pattern: {
                    value: /^[a-zA-Z\s]+$/,
                    message: "Letters and spaces only",
                  },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    placeholder="Enter First Name"
                    className={errors.fname ? "border-error-500" : ""}
                  />
                )}
              />
              {errors.fname && (
                <span className="mt-1.5 text-xs text-error-600 block">{errors.fname.message}</span>
              )}
            </div>

            {/* Last Name */}
            <div>
              <Label>
                Last Name <span className="text-error-500">*</span>
              </Label>
              <Controller
                name="lname"
                control={control}
                rules={{
                  required: "Last name is required",
                  minLength: {
                    value: 1,
                    message: "Last name must be at least 1 character",
                  },
                  maxLength: {
                    value: 50,
                    message: "Last name must be at most 50 characters",
                  },
                  pattern: {
                    value: /^[a-zA-Z\s]+$/,
                    message: "Letters and spaces only",
                  },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="text"
                    placeholder="Enter Last Name"
                    className={errors.lname ? "border-error-500" : ""}
                  />
                )}
              />
              {errors.lname && (
                <span className="mt-1.5 text-xs text-error-600 block">{errors.lname.message}</span>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <Label>
              Email <span className="text-error-500">*</span>
            </Label>
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
                  placeholder="Enter Your Email"
                  className={errors.email ? "border-error-500" : ""}
                />
              )}
            />
            {errors.email && (
              <span className="mt-1.5 text-xs text-error-600 block">{errors.email.message}</span>
            )}
          </div>

          {/* Password */}
          <div>
            <Label>
              Password <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Controller
                name="password"
                control={control}
                rules={{
                  required: "Password is required",
                  pattern: {
                    value:
                      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                    message:
                      "Min 8 characters with uppercase, lowercase, number and special character.",
                  },
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Enter Your Password"
                    type={showPassword ? "text" : "password"}
                    className={errors.password ? "border-error-500" : ""}
                  />
                )}
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {showPassword ? (
                  <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                ) : (
                  <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                )}
              </span>
            </div>
            {errors.password && (
              <span className="mt-1.5 text-xs text-error-600 block">{errors.password.message}</span>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <Label>
              Confirm Password <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Controller
                name="confirmPassword"
                control={control}
                rules={{
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === passwordValue || "Passwords do not match",
                }}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="Confirm Your Password"
                    type={showConfirm ? "text" : "password"}
                    className={errors.confirmPassword ? "border-error-500" : ""}
                  />
                )}
              />
              <span
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {showConfirm ? (
                  <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                ) : (
                  <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                )}
              </span>
            </div>
            {errors.confirmPassword && (
              <span className="mt-1.5 text-xs text-error-600 block">{errors.confirmPassword.message}</span>
            )}
          </div>

          <Button type="submit" className="w-full">
            Create Account
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400">
          Already have an account?{" "}
          <Link to="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
