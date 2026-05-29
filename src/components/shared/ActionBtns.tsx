import React from 'react';

interface ActionBtnsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  editIcon?: string;
}

const ActionBtns: React.FC<ActionBtnsProps> = ({
  onEdit,
  onDelete,
  editIcon = 'ti-pencil',
}) => (
  <div style={{ display: 'flex', gap: 6 }}>
    {onEdit && (
      <button className="action-btn-edit" onClick={onEdit} aria-label="Edit">
        <i className={`ti ${editIcon}`} aria-hidden="true" />
      </button>
    )}
    {onDelete && (
      <button className="action-btn-del" onClick={onDelete} aria-label="Delete">
        <i className="ti ti-trash" aria-hidden="true" />
      </button>
    )}
  </div>
);

export default ActionBtns;