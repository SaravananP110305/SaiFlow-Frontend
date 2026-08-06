interface UserAccountCardProps {
  role: string;
  status: string;
  memberSince: string;
}

export default function UserAccountCard({ role, status, memberSince }: UserAccountCardProps) {
  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
        Account Information
      </h4>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            Role
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {role}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            Status
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {status}
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            Member Since
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            {memberSince}
          </p>
        </div>
      </div>
    </div>
  );
}
