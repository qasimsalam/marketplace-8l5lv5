"use client"

import React, { useState, useEffect } from 'react'; // v18.2.0
import { useParams, Link } from 'next/navigation'; // v13.4.0
import { notFound } from 'next/navigation'; // v13.4.0

import { Card, CardVariant } from '../../../../../components/common/Card';
import Button, { ButtonVariant, ButtonSize } from '../../../../../components/common/Button';
import { Spinner } from '../../../../../components/common/Spinner';

import { 
  Contract, 
  Milestone, 
  ContractStatus, 
  MilestoneStatus,
  Payment
} from '../../../../../../backend/shared/src/types/payment.types';
import { UserRole } from '../../../../../../backend/shared/src/types/user.types';
import { Job } from '../../../../../types/job';

import { paymentAPI } from '../../../../../lib/api';
import { useAuth } from '../../../../../hooks/useAuth';

import { formatCurrency } from '../../../../../utils/format';
import { formatDate } from '../../../../../utils/date';

/**
 * Main page component that displays detailed contract information including milestones, 
 * payment history and actions
 */
const ContractDetailPage = () => {
  // Get contract ID from URL params
  const params = useParams();
  const contractId = params?.id as string;
  
  // State for contract data, loading, and error handling
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingMilestone, setSubmittingMilestone] = useState<string | null>(null);
  const [approvingMilestone, setApprovingMilestone] = useState<string | null>(null);
  const [rejectingMilestone, setRejectingMilestone] = useState<string | null>(null);
  
  // Get user auth information
  const { user, isAuthenticated } = useAuth();

  // Load contract data on component mount
  useEffect(() => {
    const fetchContractData = async () => {
      try {
        setLoading(true);
        const contractData = await paymentAPI.getContractById(contractId);
        setContract(contractData);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch contract:', err);
        setError('Failed to load contract data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (contractId) {
      fetchContractData();
    }
  }, [contractId]);

  // If contract not found, show 404
  if (!loading && !contract && !error) {
    notFound();
  }

  // Handle milestone submission by freelancer
  const handleSubmitMilestone = async (milestoneId: string) => {
    if (!contract) return;
    
    try {
      setSubmittingMilestone(milestoneId);
      
      // In a real implementation, we would have a form to collect files and comments
      const result = await paymentAPI.submitMilestone(
        contract.id,
        milestoneId,
        { 
          completionProof: [], 
          comments: "Work completed as requested." 
        }
      );
      
      // Update the contract with the updated milestone
      setContract(prevContract => {
        if (!prevContract) return null;
        
        return {
          ...prevContract,
          milestones: prevContract.milestones.map(m => 
            m.id === milestoneId ? result : m
          )
        };
      });
    } catch (err) {
      console.error('Failed to submit milestone:', err);
      setError('Failed to submit milestone. Please try again.');
    } finally {
      setSubmittingMilestone(null);
    }
  };

  // Handle milestone approval by client
  const handleApproveMilestone = async (milestoneId: string) => {
    if (!contract) return;
    
    try {
      setApprovingMilestone(milestoneId);
      
      const result = await paymentAPI.approveMilestone(contract.id, milestoneId);
      
      // Update the contract with the approved milestone
      setContract(prevContract => {
        if (!prevContract) return null;
        
        return {
          ...prevContract,
          milestones: prevContract.milestones.map(m => 
            m.id === milestoneId ? result : m
          )
        };
      });
    } catch (err) {
      console.error('Failed to approve milestone:', err);
      setError('Failed to approve milestone. Please try again.');
    } finally {
      setApprovingMilestone(null);
    }
  };

  // Handle milestone rejection by client
  const handleRejectMilestone = async (milestoneId: string) => {
    if (!contract) return;
    
    try {
      setRejectingMilestone(milestoneId);
      
      // In a real implementation, we would prompt for rejection reason
      const result = await paymentAPI.rejectMilestone(
        contract.id, 
        milestoneId,
        "Work does not meet requirements"
      );
      
      // Update the contract with the rejected milestone
      setContract(prevContract => {
        if (!prevContract) return null;
        
        return {
          ...prevContract,
          milestones: prevContract.milestones.map(m => 
            m.id === milestoneId ? result : m
          )
        };
      });
    } catch (err) {
      console.error('Failed to reject milestone:', err);
      setError('Failed to reject milestone. Please try again.');
    } finally {
      setRejectingMilestone(null);
    }
  };
  
  // Determine user role in context of this contract
  const userRole = user ? (
    contract?.clientId === user.id ? 'client' : 
    contract?.freelancerId === user.id ? 'freelancer' : null
  ) : null;

  // Show loading spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Show error message
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant={CardVariant.DANGER}>
          <div className="text-center py-6">
            <h2 className="text-xl font-semibold mb-4">Error Loading Contract</h2>
            <p>{error}</p>
            <Button 
              variant={ButtonVariant.PRIMARY} 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If no contract (and not loading), return 404
  if (!contract) {
    return notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Contract Header */}
      <ContractHeader contract={contract} />
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Contract Details */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Contract Details</h2>
            <ContractDetails contract={contract} userRole={userRole} />
          </Card>
        </div>
        
        {/* Contract Summary */}
        <div className="lg:col-span-1">
          <Card>
            <h2 className="text-xl font-semibold mb-4">Contract Summary</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-500">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(contract.totalAmount, contract.currency)}</p>
              </div>
              
              <div>
                <p className="text-gray-500">Contract Period</p>
                <p>{formatDate(contract.startDate)} - {formatDate(contract.endDate)}</p>
              </div>
              
              <div>
                <p className="text-gray-500">Overall Progress</p>
                <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
                  <div 
                    className="bg-primary-600 h-4 rounded-full" 
                    style={{ width: `${getContractProgress(contract.milestones)}%` }}
                  ></div>
                </div>
                <p className="text-sm mt-1">{getContractProgress(contract.milestones)}% Complete</p>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <div className="flex space-x-4">
                  <Link href={`/jobs/${contract.jobId}`} className="text-primary-600 hover:text-primary-700">
                    View Job
                  </Link>
                  <Link href={`/workspace/${contract.jobId}`} className="text-primary-600 hover:text-primary-700">
                    Go to Workspace
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Milestones Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Milestones</h2>
        <Card>
          <MilestoneList 
            milestones={contract.milestones} 
            userRole={userRole}
            contractStatus={contract.status}
            onSubmitMilestone={handleSubmitMilestone}
            onApproveMilestone={handleApproveMilestone}
            onRejectMilestone={handleRejectMilestone}
          />
        </Card>
      </div>
      
      {/* Payment History - This would be populated with data from the API */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Payment History</h2>
        <Card>
          <PaymentHistory payments={[]} currency={contract.currency} />
        </Card>
      </div>
    </div>
  );
};

/**
 * Component that displays the contract header with title, status, and summary information
 */
const ContractHeader = ({ contract }: { contract: Contract }) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
      <div>
        <h1 className="text-3xl font-bold">{contract.title}</h1>
        <div className="flex items-center mt-2">
          <span 
            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(contract.status)}`}
          >
            {contract.status}
          </span>
          <span className="mx-2 text-gray-400">•</span>
          <span className="text-gray-600">
            Contract #{contract.id.substring(0, 8)}
          </span>
        </div>
      </div>
      <div className="mt-4 md:mt-0">
        <Link href="/contracts">
          <Button variant={ButtonVariant.OUTLINE}>
            Back to Contracts
          </Button>
        </Link>
      </div>
    </div>
  );
};

/**
 * Component that displays detailed contract information including terms, parties, and attachment links
 */
const ContractDetails = ({ contract, userRole }: { contract: Contract, userRole: string | null }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Description</h3>
        <p className="text-gray-600 whitespace-pre-line">{contract.description}</p>
      </div>
      
      {contract.terms && (
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Terms & Conditions</h3>
          <div className="bg-gray-50 p-4 rounded text-gray-600 whitespace-pre-line text-sm">
            {contract.terms}
          </div>
        </div>
      )}
      
      {contract.attachments && contract.attachments.length > 0 && (
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Attachments</h3>
          <ul className="list-disc pl-5">
            {contract.attachments.map((attachment, index) => (
              <li key={index} className="text-primary-600 hover:text-primary-700">
                <a href={attachment} target="_blank" rel="noopener noreferrer">
                  {attachment.split('/').pop()}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Client</h3>
          <p className="text-gray-600">
            {userRole === 'client' ? 'You' : 'Client ID: ' + contract.clientId}
          </p>
        </div>
        <div>
          <h3 className="font-medium text-gray-700 mb-2">Freelancer</h3>
          <p className="text-gray-600">
            {userRole === 'freelancer' ? 'You' : 'Freelancer ID: ' + contract.freelancerId}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Component that displays the contract milestones with status, due dates and actions
 */
const MilestoneList = ({ 
  milestones,
  userRole,
  contractStatus,
  onSubmitMilestone,
  onApproveMilestone,
  onRejectMilestone
}: { 
  milestones: Milestone[],
  userRole: string | null,
  contractStatus: ContractStatus,
  onSubmitMilestone: (id: string) => void,
  onApproveMilestone: (id: string) => void,
  onRejectMilestone: (id: string) => void
}) => {
  // Sort milestones by order number
  const sortedMilestones = [...milestones].sort((a, b) => a.order - b.order);
  
  if (sortedMilestones.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No milestones found for this contract.
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {sortedMilestones.map((milestone) => (
        <div 
          key={milestone.id} 
          className="p-4 border border-gray-200 rounded-lg"
        >
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-medium">
                {milestone.title}
              </h3>
              <p className="text-gray-600 mt-1">{milestone.description}</p>
              
              <div className="flex flex-col sm:flex-row sm:items-center mt-3 gap-4">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Amount:</span>
                  <span className="font-semibold">{formatCurrency(milestone.amount)}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Due:</span>
                  <span>{formatDate(milestone.dueDate)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end">
              <span 
                className={`px-3 py-1 rounded-full text-sm font-medium self-start md:self-auto ${getStatusColor(milestone.status)}`}
              >
                {milestone.status}
              </span>
              
              {/* Action buttons based on role and status */}
              <div className="mt-4 flex flex-wrap gap-2">
                {/* Freelancer can submit milestone if it's pending or in progress */}
                {userRole === 'freelancer' && 
                 (milestone.status === MilestoneStatus.PENDING || 
                  milestone.status === MilestoneStatus.IN_PROGRESS) && 
                 contractStatus === ContractStatus.ACTIVE && (
                  <Button
                    variant={ButtonVariant.PRIMARY}
                    size={ButtonSize.SMALL}
                    onClick={() => onSubmitMilestone(milestone.id)}
                    isLoading={submittingMilestone === milestone.id}
                  >
                    Submit for Review
                  </Button>
                )}
                
                {/* Client can approve or reject submitted milestones */}
                {userRole === 'client' && 
                 milestone.status === MilestoneStatus.SUBMITTED &&
                 contractStatus === ContractStatus.ACTIVE && (
                  <>
                    <Button
                      variant={ButtonVariant.SUCCESS}
                      size={ButtonSize.SMALL}
                      onClick={() => onApproveMilestone(milestone.id)}
                      isLoading={approvingMilestone === milestone.id}
                    >
                      Approve
                    </Button>
                    <Button
                      variant={ButtonVariant.DANGER}
                      size={ButtonSize.SMALL}
                      onClick={() => onRejectMilestone(milestone.id)}
                      isLoading={rejectingMilestone === milestone.id}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Progress bar for in-progress milestones */}
          {milestone.status === MilestoneStatus.IN_PROGRESS && (
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: '50%' }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-1">Progress: 50%</p>
            </div>
          )}
          
          {/* Show completion proof documents if milestone is submitted, approved, or paid */}
          {(milestone.status === MilestoneStatus.SUBMITTED ||
            milestone.status === MilestoneStatus.APPROVED ||
            milestone.status === MilestoneStatus.PAID) && 
            milestone.completionProof && 
            milestone.completionProof.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700">Completion Proof</h4>
              <ul className="mt-2 list-disc pl-5">
                {milestone.completionProof.map((proof, index) => (
                  <li key={index} className="text-primary-600 hover:text-primary-700">
                    <a href={proof} target="_blank" rel="noopener noreferrer">
                      {proof.split('/').pop()}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Component that displays the contract payment history
 */
const PaymentHistory = ({ 
  payments, 
  currency 
}: { 
  payments: Payment[], 
  currency: string 
}) => {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No payment history available.
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Date
            </th>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Description
            </th>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Amount
            </th>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(payment.createdAt)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {payment.description}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {formatCurrency(payment.amount, currency)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span 
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(payment.status)}`}
                >
                  {payment.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Helper function that returns the appropriate color class based on status
 */
const getStatusColor = (status: string): string => {
  const statusMap: Record<string, string> = {
    // Contract statuses
    [ContractStatus.DRAFT]: 'bg-gray-100 text-gray-800',
    [ContractStatus.PENDING_APPROVAL]: 'bg-blue-100 text-blue-800',
    [ContractStatus.ACTIVE]: 'bg-green-100 text-green-800',
    [ContractStatus.COMPLETED]: 'bg-purple-100 text-purple-800',
    [ContractStatus.CANCELLED]: 'bg-red-100 text-red-800',
    [ContractStatus.DISPUTED]: 'bg-yellow-100 text-yellow-800',
    
    // Milestone statuses
    [MilestoneStatus.PENDING]: 'bg-gray-100 text-gray-800',
    [MilestoneStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
    [MilestoneStatus.SUBMITTED]: 'bg-yellow-100 text-yellow-800',
    [MilestoneStatus.APPROVED]: 'bg-green-100 text-green-800',
    [MilestoneStatus.REJECTED]: 'bg-red-100 text-red-800',
    [MilestoneStatus.PAID]: 'bg-purple-100 text-purple-800',
  };
  
  return statusMap[status] || 'bg-gray-100 text-gray-800';
};

/**
 * Helper function that calculates the percentage of completed milestones
 */
const getContractProgress = (milestones: Milestone[] = []): number => {
  if (!milestones.length) return 0;
  
  const completedMilestones = milestones.filter(
    m => m.status === MilestoneStatus.APPROVED || m.status === MilestoneStatus.PAID
  ).length;
  
  return Math.round((completedMilestones / milestones.length) * 100);
};

export default ContractDetailPage;