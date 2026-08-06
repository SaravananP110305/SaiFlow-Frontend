import { useEffect, useRef, useState } from "react";

interface UserMetaCardProps {
  name: string;
  avatarUrl?: string | null;
  uploading?: boolean;
  onEdit?: () => void;
  onPhotoChange?: (file: File) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function UserMetaCard({
  name,
  avatarUrl,
  uploading = false,
  onEdit,
  onPhotoChange
}: UserMetaCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imgFailed, setImgFailed] = useState(false);

  // Reset the error fallback whenever a new photo URL arrives so a previously
  // failed image doesn't keep the initials placeholder forever.
  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onPhotoChange) {
      onPhotoChange(file);
    }
    // Reset so the same file can be selected again after an error/retry
    e.target.value = "";
  };

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col items-center gap-6 xl:flex-row">
          <div className="group/avatar relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-brand-50 text-2xl font-semibold text-brand-500 dark:border-gray-800 dark:bg-brand-500/10 dark:text-brand-400">
            {avatarUrl && !imgFailed ? (
              <img
                src={avatarUrl}
                alt={name}
                className="h-full w-full object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                {getInitials(name)}
              </span>
            )}

            {onPhotoChange && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Change profile photo"
                  title="Change profile photo"
                  className="group/btn absolute inset-0 flex items-center justify-center rounded-full bg-gray-900/0 text-white transition-colors duration-200 hover:bg-gray-900/60 focus-visible:bg-gray-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {uploading ? (
                    <svg
                      className="animate-spin"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                  ) : (
                    <span className="flex flex-col items-center gap-1 opacity-0 transition-opacity duration-200 group-hover/btn:opacity-100 group-focus-visible/btn:opacity-100">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"
                          fill="currentColor"
                        />
                        <path
                          d="M9.27 4.05L10.5 2.5h3l1.23 1.55H19a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2v-11a2 2 0 012-2h4.27zM12 17.5a5 5 0 110-10 5 5 0 010 10z"
                          fill="currentColor"
                        />
                      </svg>
                      <span className="text-[10px] font-medium leading-none tracking-wide">
                        Change
                      </span>
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-center text-gray-800 dark:text-white/90 xl:text-left">
              {name}
            </h4>
          </div>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 sm:w-auto"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill=""
              />
            </svg>
            Edit Profile
          </button>
        )}
      </div>
    </div>
  );
}
