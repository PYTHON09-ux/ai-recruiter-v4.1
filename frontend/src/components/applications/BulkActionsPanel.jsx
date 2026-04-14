import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Clock, 
  UserCheck, 
  MessageSquare, 
  ChevronDown,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const BulkActionsPanel = ({ selectedApplications, onBulkAction, onClearSelection }) => {
  const [showActions, setShowActions] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [notes, setNotes] = useState('');

  const bulkActions = [
    {
      id: 'shortlisted',
      label: 'Shortlist',
      icon: Check,
      color: 'text-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      description: 'Move selected applications to shortlisted status'
    },
    {
      id: 'reviewing',
      label: 'Mark as Reviewing',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 hover:bg-yellow-100',
      description: 'Set status to under review'
    },
    {
      id: 'interviewed',
      label: 'Mark as Interviewed',
      icon: UserCheck,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      description: 'Update status to interviewed'
    },
    {
      id: 'rejected',
      label: 'Reject',
      icon: X,
      color: 'text-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100',
      description: 'Reject selected applications',
      requiresConfirmation: true
    }
  ];

  const handleActionClick = (action) => {
    if (action.requiresConfirmation) {
      setPendingAction(action);
      setShowConfirmDialog(true);
    } else {
      executeBulkAction(action);
    }
    setShowActions(false);
  };

  const executeBulkAction = async (action) => {
    try {
      await onBulkAction(selectedApplications, action.id, notes);
      toast.success(`${selectedApplications.length} applications ${action.label.toLowerCase()}`);
      onClearSelection();
      setNotes('');
    } catch (error) {
      toast.error(`Failed to ${action.label.toLowerCase()} applications`);
    }
  };

  const handleConfirmAction = () => {
    if (pendingAction) {
      executeBulkAction(pendingAction);
      setShowConfirmDialog(false);
      setPendingAction(null);
    }
  };

  const handleCancelAction = () => {
    setShowConfirmDialog(false);
    setPendingAction(null);
    setNotes('');
  };

  if (selectedApplications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-900">
                {selectedApplications.length} application{selectedApplications.length !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>Actions</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showActions ? 'rotate-180' : ''}`} />
              </button>

              {showActions && (
                <div className="absolute bottom-full mb-2 left-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  {bulkActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleActionClick(action)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${action.bgColor}`}
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className={`w-4 h-4 ${action.color}`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{action.label}</p>
                            <p className="text-xs text-gray-600">{action.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={onClearSelection}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && pendingAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Confirm {pendingAction.label}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to {pendingAction.label.toLowerCase()} {selectedApplications.length} applications?
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add a note for this action..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancelAction}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  className={`px-4 py-2 text-white rounded-lg transition-colors ${
                    pendingAction.id === 'rejected' 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {pendingAction.label}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkActionsPanel;