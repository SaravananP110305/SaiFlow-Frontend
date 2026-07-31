import React from "react";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";
import logo from "/images/logo/Saiflow.png";

export default function AuthLayout({
  children,
  hideLogo = false,
}: {
  children: React.ReactNode;
  hideLogo?: boolean;
}) {
  return (
    <div className="relative bg-white dark:bg-gray-900 min-h-screen">
      <div className="relative flex flex-col w-full min-h-screen px-6 py-12 sm:px-10">
        <div className="flex flex-col items-center w-full max-w-lg mx-auto my-auto">
          {/* SaiFlow logo */}
          {!hideLogo && (
            <div className="mb-10">
              <img
                src={logo}
                alt="Logo"
                className="w-32 h-auto dark:invert dark:hue-rotate-180"
              />
            </div>
          )}

          {/* Form */}
          {children}
        </div>

        {/* Theme toggler */}
        <div className="fixed z-50 hidden bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
