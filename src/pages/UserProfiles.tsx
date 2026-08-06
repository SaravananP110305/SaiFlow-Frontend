import { useEffect, useState } from "react";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserAccountCard from "../components/UserProfile/UserAccountCard";
import PageMeta from "../components/common/PageMeta";
import { useModal } from "../hooks/useModal";
import { useToast } from "../hooks/useToast";
import { Modal } from "../components/ui/modal";
import Button from "../components/ui/button/Button";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import { authService } from "../services/authService";
import { resolveMediaUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface ProfileFormValues {
  name: string;
  email: string;
  phone: string;
}

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const getErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Failed to update profile.";
};

export default function UserProfiles() {
  const { isOpen, openModal, closeModal } = useModal();
  const { showToast } = useToast();
  const { refetchUser } = useAuth();

  const [profile, setProfile] = useState<{
    name: string;
    email: string;
    phone: string;
    avatarUrl: string | null;
    role: { name: string } | null;
    status: string;
    createdAt: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [form, setForm] = useState<ProfileFormValues>({
    name: "",
    email: "",
    phone: ""
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormValues, string>>>({});

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      try {
        const user = await authService.getMe();
        if (!mounted) return;
        setProfile(user ?? null);
        if (user) {
          setForm({
            name: user.name ?? "",
            email: user.email ?? "",
            phone: user.phone ?? ""
          });
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (field: keyof ProfileFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhotoChange = async (file: File) => {
    if (photoUploading) return;

    if (!file.type.startsWith("image/")) {
      showToast("Please choose an image file.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be 5 MB or smaller.", "error");
      return;
    }

    setPhotoUploading(true);
    try {
      const updated = await authService.uploadProfilePhoto(file);
      if (updated) {
        setProfile((prev) =>
          prev ? { ...prev, avatarUrl: updated.avatarUrl ?? null } : prev
        );
        refetchUser();
        showToast("Profile photo updated successfully.", "success");
      }
    } catch (err: unknown) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = async () => {
    const newErrors: Partial<Record<keyof ProfileFormValues, string>> = {};
    if (!form.name.trim()) newErrors.name = "This field is required";
    if (!form.email.trim()) {
      newErrors.email = "This field is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim()
      });
      setProfile(updated ?? null);
      refetchUser();
      showToast("Profile updated successfully.", "success");
      closeModal();
    } catch (err: unknown) {
      showToast(getErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
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
        {loading ? (
          <div className="py-16 text-center text-theme-sm text-gray-400">
            Loading profile...
          </div>
        ) : !profile ? (
          <div className="py-16 text-center text-theme-sm text-gray-400">
            Unable to load your profile.
          </div>
        ) : (
          <div className="space-y-6">
            <UserMetaCard
              name={profile.name}
              avatarUrl={resolveMediaUrl(profile.avatarUrl)}
              uploading={photoUploading}
              onPhotoChange={handlePhotoChange}
              onEdit={openModal}
            />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <UserInfoCard
                name={profile.name}
                email={profile.email}
                phone={profile.phone}
              />
              <UserAccountCard
                role={profile.role?.name ?? "—"}
                status={profile.status}
                memberSince={formatDate(profile.createdAt)}
              />
            </div>
          </div>
        )}
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
                  {renderField("phone", "Phone", false, "col-span-2 lg:col-span-1")}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button type="button" size="sm" variant="outline" onClick={closeModal}>
                Close
              </Button>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
