import { useForm, Controller } from "react-hook-form";
import { Link } from "react-router";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import { useToast } from "../../hooks/useToast";

interface ForgotPasswordFormValues {
  email: string;
}

export default function ForgotPasswordForm() {
  const { showToast } = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = () => {
    showToast("Password reset link sent to your email.", "success");
  };

  const onError = (formErrors: any) => {
    if (formErrors.email?.type === "pattern") {
      showToast("Please enter a valid email address.", "error");
    } else {
      showToast("Please fill all required fields.", "error");
    }
  };

  return (
    <div className="flex flex-col justify-center flex-1 w-full max-w-md px-6 mx-auto lg:px-0">
      <div className="mb-8">
        <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
          Forgot Password?
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter your email address and we'll send you a link to reset your password.
        </p>
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
                  type="email"
                  placeholder="info@saiflow.com"
                  className={errors.email ? "border-error-500" : ""}
                />
              )}
            />
            {errors.email && (
              <span className="mt-1.5 text-xs text-error-600 block">{errors.email.message}</span>
            )}
          </div>

          <Button type="submit" className="w-full" size="sm">
            Send Reset Link
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400">
          Remember your password?{" "}
          <Link to="/signin" className="text-brand-500 hover:text-brand-600 dark:text-brand-400">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
