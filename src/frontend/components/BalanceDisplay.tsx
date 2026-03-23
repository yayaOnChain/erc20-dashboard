import React from "react";

interface BalanceDisplayProps {
  ethBalance: string | null;
  tokenBalance: string | null;
  tokenSymbol: string | null;
  tokenName: string | null;
  isLoading: boolean;
}

export const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  ethBalance,
  tokenBalance,
  tokenSymbol,
  tokenName,
  isLoading,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* ETH Balance Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-md border border-blue-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L6 12l6 10 6-10L12 2zm0 3.5L15.5 12 12 18.5 8.5 12 12 5.5z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-600">ETH Balance</h3>
            <p className="text-xs text-blue-400">Native Token</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-blue-900">
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            `${parseFloat(ethBalance || "0").toFixed(4)} ETH`
          )}
        </p>
      </div>

      {/* Token Balance Card */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl shadow-md border border-purple-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 3.01 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.29-.72-2.38-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-3.01 0-1.96-1.61-2.67-3.66-3.18z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-purple-600">{tokenName || "Token"} Balance</h3>
            <p className="text-xs text-purple-400">{tokenSymbol || "MTK"}</p>
          </div>
        </div>
        <p className="text-2xl font-bold text-purple-900">
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            `${parseFloat(tokenBalance || "0").toFixed(2)} ${tokenSymbol || "MTK"}`
          )}
        </p>
      </div>
    </div>
  );
};
