import React from "react";

interface NetworkDetectorProps {
  chainId: number | null;
  onSwitchNetwork: (chainId: number) => void;
}

export const NetworkDetector: React.FC<NetworkDetectorProps> = ({ chainId, onSwitchNetwork }) => {
  const getNetworkName = (id: number | null) => {
    switch (id) {
      case 31337:
        return "Hardhat Local";
      case 11155111:
        return "Sepolia Testnet";
      case 1:
        return "Ethereum Mainnet";
      case 5:
        return "Goerli Testnet";
      default:
        return id ? `Unknown (${id})` : "Not Connected";
    }
  };

  const isSupportedNetwork = chainId === 11155111 || chainId === 31337;

  return (
    <div className={`p-4 rounded-lg border ${
      chainId === null
        ? "bg-gray-100 border-gray-300"
        : isSupportedNetwork
        ? "bg-green-100 border-green-300"
        : "bg-yellow-100 border-yellow-300"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            chainId === null
              ? "bg-gray-400"
              : isSupportedNetwork
              ? "bg-green-500 animate-pulse"
              : "bg-yellow-500 animate-pulse"
          }`}></div>
          <div>
            <p className={`text-sm font-medium ${
              chainId === null
                ? "text-gray-600"
                : isSupportedNetwork
                ? "text-green-800"
                : "text-yellow-800"
            }`}>
              Network: {getNetworkName(chainId)}
            </p>
            {!isSupportedNetwork && chainId !== null && (
              <p className="text-xs text-yellow-600 mt-1">
                Please switch to Sepolia Testnet for best experience
              </p>
            )}
          </div>
        </div>
        {!isSupportedNetwork && chainId !== null && (
          <button
            onClick={() => onSwitchNetwork(11155111)}
            className="px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded-md transition-colors duration-200"
          >
            Switch to Sepolia
          </button>
        )}
      </div>
    </div>
  );
};
