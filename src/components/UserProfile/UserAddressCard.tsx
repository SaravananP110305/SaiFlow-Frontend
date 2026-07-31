export default function UserAddressCard() {
  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
        Address
      </h4>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            Country
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            United States
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            City
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            Phoenix
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            State
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            Arizona
          </p>
        </div>

        <div>
          <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
            Postal Code
          </p>
          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
            ERT 2489
          </p>
        </div>
      </div>
    </div>
  );
}
