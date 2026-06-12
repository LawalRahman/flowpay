import React, { useState } from 'react';
import { Keypair } from 'stellar-sdk';

interface Wallet {
  publicKey: string;
  secretKey?: string;
}

interface WalletConnectProps {
  onConnect: (wallet: Wallet) => void;
  onDisconnect: () => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  onConnect,
  onDisconnect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [error, setError] = useState('');
  const [connectedWallet, setConnectedWallet] = useState<Wallet | null>(null);

  const handleGenerateWallet = () => {
    const keypair = Keypair.random();
    const wallet: Wallet = {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
    };

    setConnectedWallet(wallet);
    setSecretKey(wallet.secretKey || '');
    onConnect(wallet);
    setError('');
  };

  const handleImportWallet = () => {
    try {
      const keypair = Keypair.fromSecret(secretKey);
      const wallet: Wallet = {
        publicKey: keypair.publicKey(),
        secretKey: keypair.secret(),
      };

      setConnectedWallet(wallet);
      onConnect(wallet);
      setError('');
      setIsOpen(false);
    } catch (err) {
      setError('Invalid secret key');
    }
  };

  const handleDisconnect = () => {
    setConnectedWallet(null);
    setSecretKey('');
    setError('');
    onDisconnect();
  };

  if (connectedWallet) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Wallet Connected</h3>
            <p className="text-xs text-gray-600 mt-1 break-all">
              {connectedWallet.publicKey}
            </p>
          </div>
          <button
            onClick={handleDisconnect}
            className="px-3 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
      >
        Connect Wallet
      </button>

      {isOpen && (
        <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
                {error}
              </div>
            )}

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Connect Wallet</h4>

              <button
                onClick={handleGenerateWallet}
                className="w-full px-4 py-2 mb-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                🔐 Generate New Wallet
              </button>

              <div className="relative">
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Enter secret key (S...)"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>

              <button
                onClick={handleImportWallet}
                disabled={!secretKey}
                className="w-full mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Import Wallet
              </button>
            </div>

            <div className="border-t pt-4">
              <p className="text-xs text-gray-600">
                ⚠️ Never share your secret key. Store it securely.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
