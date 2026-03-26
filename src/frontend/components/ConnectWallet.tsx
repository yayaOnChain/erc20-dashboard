import React from "react";

interface ConnectWalletProps {
  address: string | null;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const ConnectWallet: React.FC<ConnectWalletProps> = ({
  address,
  isConnected,
  onConnect,
  onDisconnect,
}) => {
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex items-center gap-4">
      {isConnected && address ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
            <span
              data-testid="status-indicator"
              className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
            ></span>
            <span className="font-mono text-sm">{formatAddress(address)}</span>
          </div>
          <button
            onClick={onDisconnect}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium shadow-md hover:shadow-lg"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};
