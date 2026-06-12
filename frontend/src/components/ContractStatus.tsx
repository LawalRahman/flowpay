import React from 'react';

interface ContractStatusProps {
  contractId: string;
  status: 'connected' | 'error' | 'loading' | 'pending';
  type: 'payment_channel' | 'escrow' | 'merchant_registry' | 'recurring_payment';
  transactionHash?: string;
  message?: string;
}

export const ContractStatus: React.FC<ContractStatusProps> = ({
  contractId,
  status,
  type,
  transactionHash,
  message,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'loading':
        return 'bg-yellow-50 border-yellow-200';
      case 'pending':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return '✓';
      case 'error':
        return '✕';
      case 'loading':
        return '⟳';
      case 'pending':
        return '↻';
      default:
        return '—';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'loading':
        return 'Loading';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  const getContractName = () => {
    switch (type) {
      case 'payment_channel':
        return 'Payment Channel';
      case 'escrow':
        return 'Escrow';
      case 'merchant_registry':
        return 'Merchant Registry';
      case 'recurring_payment':
        return 'Recurring Payment';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getStatusIcon()}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{getContractName()}</h3>
              <p className="text-xs text-gray-600 mt-1 break-all font-mono">
                {contractId}
              </p>
            </div>
          </div>

          {transactionHash && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">Transaction:</p>
              <p className="text-xs text-gray-600 break-all font-mono">
                {transactionHash.substring(0, 32)}...
              </p>
            </div>
          )}

          {message && (
            <div className="mt-2">
              <p className="text-xs text-gray-700">{message}</p>
            </div>
          )}
        </div>

        <span className="ml-4 px-3 py-1 text-xs font-semibold rounded-full bg-white border">
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};
