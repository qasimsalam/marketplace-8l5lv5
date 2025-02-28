"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardVariant } from '../../../components/common/Card';
import Button, { ButtonVariant, ButtonSize } from '../../../components/common/Button';
import { Spinner } from '../../../components/common/Spinner';
import { useAuth } from '../../../hooks/useAuth';
import useToast from '../../../hooks/useToast';
import { paymentAPI } from '../../../lib/api';
import { Contract, ContractStatus } from '../../../../backend/shared/src/types/payment.types';
import { formatCurrency } from '../../../utils/format';
import { formatDate } from '../../../utils/date';

const ContractsPage = (): JSX.Element => {
  // State for storing contracts data
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();

  // Fetch contracts when the component mounts
  useEffect(() => {
    if (isAuthenticated) {
      fetchContracts();
    }
  }, [isAuthenticated, currentPage]);

  // Function to fetch contracts from API
  const fetchContracts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await paymentAPI.getContracts(currentPage, 10);
      setContracts(response.contracts);
      setTotalPages(Math.ceil(response.total / response.limit));
    } catch (error) {
      setError('Failed to load contracts. Please try again.');
      showToast('Failed to load contracts', 'error');
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine badge color based on contract status
  const getStatusBadgeColor = (status: ContractStatus): string => {
    switch (status) {
      case ContractStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case ContractStatus.COMPLETED:
        return 'bg-blue-100 text-blue-800';
      case ContractStatus.PENDING_APPROVAL:
        return 'bg-yellow-100 text-yellow-800';
      case ContractStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case ContractStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      case ContractStatus.DISPUTED:
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Helper function to format status text
  const formatStatus = (status: ContractStatus): string => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Filter contracts based on selected status
  const filteredContracts = statusFilter === 'all' 
    ? contracts 
    : contracts.filter(contract => contract.status === statusFilter);

  // Function to handle pagination
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Function to handle view contract details
  const handleViewContract = (contractId: string) => {
    window.location.href = `/contracts/${contractId}`;
  };

  // Function to handle view payments
  const handleViewPayments = (contractId: string) => {
    window.location.href = `/contracts/${contractId}/payments`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold">My Contracts</h1>
        
        {/* Filter controls */}
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button 
            variant={statusFilter === 'all' ? ButtonVariant.PRIMARY : ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button 
            variant={statusFilter === ContractStatus.ACTIVE ? ButtonVariant.PRIMARY : ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            onClick={() => setStatusFilter(ContractStatus.ACTIVE)}
          >
            Active
          </Button>
          <Button 
            variant={statusFilter === ContractStatus.PENDING_APPROVAL ? ButtonVariant.PRIMARY : ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            onClick={() => setStatusFilter(ContractStatus.PENDING_APPROVAL)}
          >
            Pending
          </Button>
          <Button 
            variant={statusFilter === ContractStatus.COMPLETED ? ButtonVariant.PRIMARY : ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            onClick={() => setStatusFilter(ContractStatus.COMPLETED)}
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center p-12">
          <Spinner />
          <span className="ml-3">Loading contracts...</span>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          <p>{error}</p>
          <Button
            variant={ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            onClick={fetchContracts}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredContracts.length === 0 && (
        <div className="text-center p-12 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No contracts found</h3>
          <p className="text-gray-500 mb-4">
            {statusFilter === 'all' 
              ? "You don't have any contracts yet." 
              : `You don't have any ${formatStatus(statusFilter).toLowerCase()} contracts.`}
          </p>
        </div>
      )}

      {/* Contract list */}
      {!loading && !error && filteredContracts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContracts.map(contract => (
            <Card 
              key={contract.id} 
              variant={CardVariant.DEFAULT}
              className="overflow-hidden"
              header={
                <div>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900 truncate" title={contract.title}>
                      {contract.title}
                    </h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(contract.status)}`}>
                      {formatStatus(contract.status)}
                    </span>
                  </div>
                </div>
              }
              footer={
                <div className="flex justify-between gap-2">
                  <Button
                    variant={ButtonVariant.OUTLINE}
                    size={ButtonSize.SMALL}
                    onClick={() => handleViewContract(contract.id)}
                    className="flex-1"
                  >
                    View Details
                  </Button>
                  <Button
                    variant={ButtonVariant.PRIMARY}
                    size={ButtonSize.SMALL}
                    onClick={() => handleViewPayments(contract.id)}
                    className="flex-1"
                  >
                    Payments
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Contract Value:</span>
                  <span className="font-medium">{formatCurrency(contract.totalAmount, contract.currency)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Parties:</span>
                  <span className="font-medium truncate max-w-[150px]" title={user?.id === contract.clientId ? 'You (Client)' : 'You (Freelancer)'}>
                    {user?.id === contract.clientId ? 'You (Client)' : 'You (Freelancer)'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Start Date:</span>
                  <span className="font-medium">{formatDate(contract.startDate)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">End Date:</span>
                  <span className="font-medium">{formatDate(contract.endDate)}</span>
                </div>
                
                {contract.milestones && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Milestones:</span>
                    <span className="font-medium">{contract.milestones.length}</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <Button
            variant={ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="mr-2"
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant={ButtonVariant.OUTLINE}
            size={ButtonSize.SMALL}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="ml-2"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default ContractsPage;