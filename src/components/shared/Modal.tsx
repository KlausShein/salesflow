import React from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children, width = 420 }) => (
  <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal-box" style={{ width }}>
      <div className="modal-header">
        <h2 className="modal-title">{title}</h2>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <i className="ti ti-x" aria-hidden="true" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default Modal;