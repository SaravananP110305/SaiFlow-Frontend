import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm, Controller } from "react-hook-form";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useToast } from "../../hooks/useToast";
import { getStorage, setStorage } from "../../utils/storage";
import logo from "/images/logo/Saiflow.png";

interface SignInFormValues {
  email: string;
  password: string;
}

export default function SignInForm() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = (data: SignInFormValues) => {
    const currentUsers = getStorage<any[]>("saiflow_users", [
      { id: 1, name: "John Doe", email: "john.doe@saiflow.com", phone: "+91 98765 43210", role: "Administrator", status: "Active" },
      { id: 2, name: "Jane Smith", email: "jane.smith@saiflow.com", phone: "+91 98765 43211", role: "Business Development Manager", status: "Active" },
      { id: 3, name: "Alice Johnson", email: "alice.johnson@saiflow.com", phone: "+91 98765 43212", role: "Business Development Executive", status: "Active" },
      { id: 4, name: "Robert Lee", email: "robert.lee@saiflow.com", phone: "+91 98765 43213", role: "Presales Consultant", status: "Active" },
      { id: 5, name: "Emma Watson", email: "emma.watson@saiflow.com", phone: "+91 98765 43214", role: "Guest User", status: "Inactive" }
    ]);

    let foundUser = currentUsers.find(u => u.email.toLowerCase() === data.email.toLowerCase());

    // Explicitly support the required admin@gmail.com account
    if (data.email.toLowerCase() === "admin@gmail.com") {
      if (data.password !== "Admin@123") {
        showToast("Invalid Email or Password.", "error");
        return;
      }
      foundUser = {
        id: 99,
        name: "Admin User",
        email: "admin@gmail.com",
        phone: "+91 98765 99999",
        role: "Administrator",
        status: "Active"
      };
    } else {
      if (!foundUser) {
        showToast("Invalid Email or Password.", "error");
        return;
      }

      if (foundUser.status === "Inactive") {
        showToast("This account is inactive. Please contact administrator.", "error");
        return;
      }

      if (data.password !== "Admin@123") {
        showToast("Invalid Email or Password.", "error");
        return;
      }
    }

    setStorage("saiflow_logged_in_user", foundUser);
    showToast("Sign in successful.", "success");
    navigate("/dashboard");
  };

  const onError = (formErrors: any) => {
    if (formErrors.email?.type === "pattern") {
      showToast("Please enter a valid email address.", "error");
    } else {
      showToast("Please fill all required fields.", "error");
    }
  };

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-gray-700 dark:bg-gray-900/50">
      {/* SaiFlow logo */}
      <div className="flex justify-center mb-8">
        <img
          src={logo}
          alt="Logo"
          className="w-32 h-auto dark:invert dark:hue-rotate-180"
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit, onError)}>
        <div className="space-y-5">
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
                  placeholder="info@saiflow.com"
                  className={errors.email ? "border-error-500" : ""}
                />
              )}
            />
            {errors.email && (
              <span className="mt-1.5 text-xs text-error-600 block">{errors.email.message}</span>
            )}
          </div>

          <div>
            <Label>
              Password <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <Controller
                name="password"
                control={control}
                rules={{ required: "Password is required" }}
                render={({ field }) => (
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
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

          <Button type="submit" className="w-full" size="sm">
            Sign in
          </Button>
        </div>
      </form>

      {/*<div className="mt-6">
        <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400">
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
            Sign up
          </Link>
        </p>
      </div>*/}
    </div>
  );
}
