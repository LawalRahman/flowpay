import React from 'react';

export interface Transaction {
  id: string;
  hash: string;
  type: 'payment' | 'escrow' | 'subscription' | 'merchant';
  status: 'pending' | 'confirmed' | 'failed';
  amount?: number;
  asset?: string;
  timestamp: Date;
  from: string;
  to: string;
  description: string;
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  isLoading = false,
}) => {
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return '💳';
      case 'escrow':
        return '🔒';
      case 'subscription':
        return '🔄';
      case 'merchant':
        return '🏪';
      default:
        return '📝';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-200 h-16 rounded" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => (
        <div
          key={tx.id}
          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-2xl">{getTypeIcon(tx.type)}</span>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900">{tx.description}</h4>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-semibold ${getStatusBadgeColor(
                      tx.status
                    )}`}
                  >
                    {tx.status}
                  </span>
                </div>

                <p className="text-xs text-gray-600 mt-1 font-mono break-all">
                  {tx.hash.substring(0, 32)}...
                </p>

                <div className="flex gap-4 mt-2 text-xs text-gray-600">
                  <span>{tx.from.substring(0, 8)}...</span>
                  <span>→</span>
                  <span>{tx.to.substring(0, 8)}...</span>
                  {tx.amount && (
                    <>
                      <span>|</span>
                      <span className="font-semibold">
                        {tx.amount} {tx.asset}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-500">
                {tx.timestamp.toLocaleDateString()}
              </p>
              <p className="text-xs text-gray-500">
                {tx.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
