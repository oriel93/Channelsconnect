import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Edit3, DollarSign, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { updateCalendarEntry } from '@/api/functions';
import { toast } from 'sonner';

export default function InlineEditableField({
  entry,
  field,
  onUpdate,
  disabled = false,
  className = ''
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(entry[field] || '');
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const inputRef = useRef(null);

  // Update local state when entry changes
  useEffect(() => {
    setEditValue(entry[field] || '');
  }, [entry[field], field]);

  // Focus and select on edit
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  // Check for changes
  useEffect(() => {
    setHasChanges(editValue !== (entry[field] || ''));
  }, [editValue, entry[field]]);

  const handleEdit = useCallback(() => {
    if (disabled) return;
    setEditValue(entry[field] || '');
    setIsEditing(true);
  }, [disabled, entry[field], field]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    
    try {
      let processedValue = editValue;
      
      // Process value based on field type
      if (field === 'price') {
        processedValue = parseFloat(editValue) || 0;
      } else if (field === 'minimum_stay') {
        processedValue = parseInt(editValue) || 1;
      }

      const updateData = {
        [field]: processedValue
      };

      const { data } = await updateCalendarEntry({
        entryId: entry.id,
        updateData,
        propertyId: entry.property_id,
        date: entry.date
      });
      
      toast.success(`${getFieldLabel(field)} updated successfully`);
      setIsEditing(false);
      
      if (onUpdate) {
        onUpdate(data);
      }
    } catch (error) {
      toast.error(`Failed to update ${getFieldLabel(field)}: ${error.message}`);
      console.error('Update error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [editValue, hasChanges, entry, field, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditValue(entry[field] || '');
    setIsEditing(false);
  }, [entry[field], field]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const getFieldIcon = (fieldName) => {
    switch (fieldName) {
      case 'price': return <DollarSign size={12} />;
      case 'status': return <CalendarIcon size={12} />;
      case 'minimum_stay': return <Clock size={12} />;
      default: return <Edit3 size={12} />;
    }
  };

  const getFieldLabel = (fieldName) => {
    switch (fieldName) {
      case 'price': return 'Price';
      case 'status': return 'Status';
      case 'minimum_stay': return 'Minimum Stay';
      case 'notes': return 'Notes';
      default: return fieldName;
    }
  };

  const getFieldDisplay = (fieldName, value) => {
    switch (fieldName) {
      case 'price':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0
        }).format(value || 0);
      case 'status':
        return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Available';
      case 'minimum_stay':
        return value ? `${value} night${value > 1 ? 's' : ''}` : '1 night';
      case 'notes':
        return value || 'Add notes...';
      default:
        return value || 'Not set';
    }
  };

  const renderEditInput = () => {
    const commonProps = {
      ref: inputRef,
      value: editValue,
      onChange: (e) => setEditValue(e.target.value),
      onKeyDown: handleKeyDown,
      disabled: isLoading,
      className: "inline-edit-input"
    };

    if (field === 'status') {
      return (
        <select {...commonProps}>
          <option value="available">Available</option>
          <option value="blocked">Blocked</option>
          <option value="booked">Booked</option>
          <option value="maintenance">Maintenance</option>
        </select>
      );
    }

    if (field === 'notes') {
      return (
        <textarea
          {...commonProps}
          rows={2}
          placeholder="Add notes..."
          className="inline-edit-textarea"
        />
      );
    }

    return (
      <input
        {...commonProps}
        type={field === 'price' || field === 'minimum_stay' ? 'number' : 'text'}
        min={field === 'price' || field === 'minimum_stay' ? 0 : undefined}
        step={field === 'price' ? 0.01 : 1}
        placeholder={getFieldLabel(field)}
      />
    );
  };

  return (
    <div className={`inline-editable-field ${className}`}>
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="editing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="edit-mode"
          >
            <div className="edit-container">
              {renderEditInput()}
              <div className="edit-actions">
                <button
                  onClick={handleSave}
                  disabled={isLoading || !hasChanges}
                  className={`save-button ${hasChanges ? 'has-changes' : ''}`}
                  title="Save changes"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Clock size={12} />
                    </motion.div>
                  ) : (
                    <Check size={12} />
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="cancel-button"
                  title="Cancel changes"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`display-mode ${disabled ? 'disabled' : ''}`}
            onClick={handleEdit}
          >
            <div className="field-display">
              <span className="field-icon">
                {getFieldIcon(field)}
              </span>
              <span className="field-value">
                {getFieldDisplay(field, entry[field])}
              </span>
              {!disabled && (
                <span className="edit-indicator">
                  <Edit3 size={10} />
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .inline-editable-field {
          position: relative;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .edit-mode {
          z-index: 10;
        }

        .edit-container {
          display: flex;
          align-items: center;
          gap: 4px;
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 6px;
          padding: 4px;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .inline-edit-input,
        .inline-edit-textarea {
          border: none;
          outline: none;
          background: transparent;
          font-size: 12px;
          font-weight: 600;
          min-width: 60px;
          padding: 2px 4px;
        }

        .inline-edit-textarea {
          resize: none;
          font-family: inherit;
        }

        .edit-actions {
          display: flex;
          gap: 2px;
        }

        .save-button,
        .cancel-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .save-button {
          background: #e5e7eb;
          color: #6b7280;
        }

        .save-button.has-changes {
          background: #10b981;
          color: white;
        }

        .save-button:hover:not(:disabled) {
          transform: scale(1.1);
        }

        .cancel-button {
          background: #fee2e2;
          color: #dc2626;
        }

        .cancel-button:hover:not(:disabled) {
          transform: scale(1.1);
          background: #fecaca;
        }

        .display-mode {
          padding: 2px 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .display-mode:hover:not(.disabled) {
          background: rgba(59, 130, 246, 0.1);
        }

        .display-mode.disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .field-display {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .field-icon {
          color: #64748b;
        }

        .field-value {
          color: #1e293b;
          min-width: 0;
          flex: 1;
        }

        .edit-indicator {
          opacity: 0;
          color: #3b82f6;
          transition: opacity 0.2s ease;
        }

        .display-mode:hover .edit-indicator {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}