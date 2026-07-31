import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Sign In | SaiFlow"
        description="Sign in to your SaiFlow account to manage leads and schedule meetings."
      />
      <AuthLayout hideLogo>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
