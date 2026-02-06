import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Input({
  label,
  error,
  helperText,
  className = '',
  required,
  ...props
}: InputProps) {
  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={props.id} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      <input
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {helperText && !error && (
        <p className="input-helper-text">{helperText}</p>
      )}
      {error && <p className="input-error-text">{error}</p>}
    </div>
  );
}
