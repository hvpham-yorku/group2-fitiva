'use client';

import { useMemo } from 'react';
import './password-requirements.css';

interface Requirement {
  label: string;
  regex: RegExp;
}

interface PasswordRequirementsProps {
  password: string;
  isVisible: boolean;
}

export default function PasswordRequirements({ password, isVisible }: PasswordRequirementsProps) {
  // Define requirements as a constant
  const requirementDefinitions: Requirement[] = [
    { label: 'At least 8 characters', regex: /.{8,}/ },
    { label: 'Contains uppercase letter', regex: /[A-Z]/ },
    { label: 'Contains lowercase letter', regex: /[a-z]/ },
    { label: 'Contains number', regex: /[0-9]/ },
    { label: 'Contains special character (!@#$%^&*)', regex: /[!@#$%^&*(),.?":{}|<>]/ },
  ];

  // Calculate met requirements using useMemo instead of useEffect
  const requirements = useMemo(() => {
    return requirementDefinitions.map(req => ({
      ...req,
      met: req.regex.test(password),
    }));
  }, [password]);

  if (!isVisible) return null;

  return (
    <div className="password-requirements-popup">
      <div className="requirements-header">Password Requirements</div>
      <ul className="requirements-list">
        {requirements.map((req, index) => (
          <li key={index} className={`requirement-item ${req.met ? 'met' : ''}`}>
            <span className={`requirement-icon ${req.met ? 'met' : ''}`}>
              {req.met ? '✓' : '○'}
            </span>
            <span className="requirement-label">{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
