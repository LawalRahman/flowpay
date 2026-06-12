import React from 'react';

export interface PaymentChannelData {
  id: string;
  payer: string;
  recipient: string;
  balance: number;
  totalDeposited: number;
  asset: string;
  status: 'active' | 'closed' | 'pending';
  createdAt: Date;
  transactionCount: number;
}

interface ChannelCardProps {
  channel: PaymentChannelData;
  onAction?: (action: 'deposit' | 'withdraw' | 'close') => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  onAction,
}) => {
  const usagePercent = (channel.balance / channel.totalDeposited) * 100;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">Payment Channel</h3>
          <p className="text-xs text-gray-600 mt-1 font-mono break-all">
            {channel.id}
          </p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
            channel.status
          )}`}
        >
          {channel.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-600 mb-1">Payer</p>
          <p className="text-sm font-mono text-gray-900 break-all">
            {channel.payer.substring(0, 12)}...
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Recipient</p>
          <p className="text-sm font-mono text-gray-900 break-all">
            {channel.recipient.substring(0, 12)}...
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded p-3 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-gray-900">Balance</span>
          <span className="text-lg font-bold text-gray-900">
            {channel.balance} {channel.asset}
          </span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {usagePercent.toFixed(1)}% of {channel.totalDeposited} {channel.asset}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4 text-center">
        <div className="bg-blue-50 rounded p-2">
          <p className="text-xs text-gray-600">Transactions</p>
          <p className="text-lg font-bold text-gray-900">
            {channel.transactionCount}
          </p>
        </div>
        <div className="bg-green-50 rounded p-2">
          <p className="text-xs text-gray-600">Created</p>
          <p className="text-xs font-semibold text-gray-900">
            {channel.createdAt.toLocaleDateString()}
          </p>
        </div>
        <div className="bg-purple-50 rounded p-2">
          <p className="text-xs text-gray-600">Asset</p>
          <p className="text-xs font-semibold text-gray-900">{channel.asset}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onAction?.('deposit')}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          💰 Deposit
        </button>
        <button
          onClick={() => onAction?.('withdraw')}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
        >
          🤑 Withdraw
        </button>
        <button
          onClick={() => onAction?.('close')}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
        >
          ✕ Close
        </button>
      </div>
    </div>
  );
};
