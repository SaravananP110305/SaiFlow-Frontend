import { useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import PageMeta from "../components/common/PageMeta";
import { useModal } from "../hooks/useModal";
import { useToast } from "../hooks/useToast";
import { Modal } from "../components/ui/modal";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";

interface ProfileFormValues {
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  state: string;
  postalCode: string;
}

export default function UserProfiles() {
  const { isOpen, openModal, closeModal } = useModal();
  const { showToast } = useToast();

  const [form, setForm] = useState<ProfileFormValues>({
    name: "Musharof Chowdhury",
    email: "randomuser@pimjo.com",
    phone: "+09 363 398 46",
    country: "United States",
    city: "Phoenix",
    state: "Arizona",
    postalCode: "ERT 2489",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>({});

  const requiredFields: (keyof ProfileFormValues)[] = [
    "name",
    "email",
    "phone",
    "country",
    "city",
    "state",
    "postalCode",
  ];

  const handleChange = (field: keyof ProfileFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = () => {
    const newErrors: Partial<Record<keyof ProfileFormValues, string>> = {};
    requiredFields.forEach((field) => {
      if (!form[field].trim()) {
        newErrors[field] = "This field is required";
      }
    });
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showToast("Please fill all required fields.", "error");
      return;
    }

    // Handle save logic here
    console.log("Saving changes...", form);
    showToast("Profile updated successfully.", "success");
    closeModal();
  };

  const renderField = (
    field: keyof ProfileFormValues,
    label: string,
    required: boolean,
    className?: string
  ) => (
    <div className={className}>
      <Label>
        {label} {required && <span className="text-error-500">*</span>}
      </Label>
      <Input
        type="text"
        value={form[field]}
        onChange={(e) => handleChange(field, e.target.value)}
        error={!!errors[field]}
        hint={errors[field]}
        className={errors[field] ? "border-error-500" : ""}
      />
    </div>
  );

  return (
    <>
      <PageMeta
        title="Profile | SaiFlow"
        description="View and manage your SaiFlow profile settings."
      />
      <PageBreadcrumb pageTitle="Profile" />
      <div className="bg-white p-5 dark:bg-white/[0.03] lg:p-6">
        <div className="space-y-6">
          <UserMetaCard onEdit={openModal} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <UserInfoCard />
            <UserAddressCard />
          </div>
        </div>
      </div>
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          <div className="px-2 pr-14">
            <h4 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Edit Profile
            </h4>
          </div>
          <form
            className="flex flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="custom-scrollbar max-h-[420px] overflow-y-auto px-2 pb-3">
              <div>
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Personal Information
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  {renderField("name", "Name", true, "col-span-2 lg:col-span-1")}
                  {renderField("email", "Email Address", true, "col-span-2 lg:col-span-1")}
                  {renderField("phone", "Phone", true, "col-span-2 lg:col-span-1")}
                </div>
              </div>
              <div className="mt-7">
                <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">
                  Address
                </h5>

                <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                  {renderField("country", "Country", true)}
                  {renderField("city", "City", true)}
                  {renderField("state", "State", true)}
                  {renderField("postalCode", "Postal Code", true)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button type="button" size="sm" variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button type="submit" size="sm">
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
