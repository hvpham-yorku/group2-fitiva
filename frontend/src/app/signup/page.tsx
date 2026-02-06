'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import PasswordRequirements from './PasswordRequirements';
import './signup.css';

interface SignupData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  is_trainer: boolean;
  trainer_data?: {
    bio: string;
    years_of_experience: number;
    specialty_strength: boolean;
    specialty_cardio: boolean;
    specialty_flexibility: boolean;
    specialty_sports: boolean;
    specialty_rehabilitation: boolean;
    certifications: string;
  };
}

// Certifications list
const CERTIFICATIONS = [
  "NASM-CPT",
  "ACE-CPT",
  "NSCA-CPT",
  "ISSA-CPT",
  "ACSM-CPT",
  "CanFitPro PTS",
  "CIMSPA Personal Trainer Level 3",
  "IFPA Personal Trainer Certification",
  "AFAA Personal Fitness Trainer",
  "CSCS",
  "NASM Performance Enhancement Specialist (PES)",
  "EXOS Performance Specialist",
  "USAW Level 1",
  "USAW Level 2",
  "NSCA Tactical Strength & Conditioning (TSAC-F)",
  "NASM Corrective Exercise Specialist (CES)",
  "ACE Orthopedic Exercise Specialist",
  "Functional Movement Screen (FMS Level 1)",
  "Functional Movement Screen (FMS Level 2)",
  "Selective Functional Movement Assessment (SFMA)",
  "Postural Restoration Institute (PRI)",
  "Dynamic Neuromuscular Stabilization (DNS)",
  "Senior Fitness Specialist",
  "Youth Fitness Specialist",
  "Pre/Postnatal Fitness Certification",
  "Cancer Exercise Specialist",
  "Medical Exercise Specialist",
  "Exercise is Medicine Credential",
  "NASM Nutrition Coach",
  "Precision Nutrition Level 1 (PN1)",
  "Precision Nutrition Level 2 (PN2)",
  "ISSA Nutritionist",
  "ACE Nutrition Specialist",
  "Sports Nutrition Certification",
  "Macros Coaching Certification",
  "IFBB Personal Trainer Certification",
  "NPC / IFBB Pro League Coach Certification",
  "ISSA Bodybuilding Specialist",
  "NASM Physique & Bodybuilding Coach",
  "CrossFit Level 1 (CF-L1)",
  "CrossFit Level 2 (CF-L2)",
  "CrossFit Level 3 (CF-L3)",
  "Hybrid Training Certification",
  "StrongFirst Kettlebell (SFG)",
  "Russian Kettlebell Certification (RKC)",
  "TRX Suspension Training",
  "Battle Ropes Instructor Certification",
  "Group Fitness Instructor Certification",
  "Spin / Cycling Instructor Certification",
  "Bootcamp Instructor Certification",
  "HIIT Instructor Certification",
  "Les Mills BodyPump",
  "Les Mills BodyCombat",
  "Les Mills BodyAttack",
  "Yoga Teacher Training (RYT-200)",
  "Yoga Teacher Training (RYT-500)",
  "Pilates Instructor Certification",
  "Mobility & Stretch Therapy Certification",
  "Breathwork Coach Certification",
  "Online Fitness Coach Certification",
  "Fitness Business Coaching Certification",
  "Behavior Change Specialist",
  "Health Coach Certification",
  "CPR/AED Certification",
  "First Aid Certification"
];

export default function SignupPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
    is_trainer: false,
    bio: '',
    years_of_experience: '',
    specialty_strength: false,
    specialty_cardio: false,
    specialty_flexibility: false,
    specialty_sports: false,
    specialty_rehabilitation: false,
    certifications: '',
  });

  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [showCertDropdown, setShowCertDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = type === 'checkbox' ? target.checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle certification selection
  const handleCertificationToggle = (cert: string) => {
    setSelectedCertifications(prev => {
      if (prev.includes(cert)) {
        return prev.filter(c => c !== cert);
      } else {
        return [...prev, cert];
      }
    });
    
    // Clear certification error if exists
    if (errors.certifications) {
      setErrors(prev => ({ ...prev, certifications: '' }));
    }
  };

  // Remove certification chip
  const handleRemoveCertification = (cert: string) => {
    setSelectedCertifications(prev => prev.filter(c => c !== cert));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate trainer fields if is_trainer is checked
    if (formData.is_trainer) {
      const newErrors: Record<string, string> = {};

      // Check if at least one specialty is selected
      const hasSpecialty = formData.specialty_strength || 
                          formData.specialty_cardio || 
                          formData.specialty_flexibility || 
                          formData.specialty_sports || 
                          formData.specialty_rehabilitation;

      if (!hasSpecialty) {
        newErrors.specialties = 'Please select at least one specialty';
      }

      // Check if errors exist
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }

    setIsLoading(true);

    try {
      const submitData: SignupData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        password2: formData.password2,
        first_name: formData.first_name,
        last_name: formData.last_name,
        is_trainer: formData.is_trainer,
      };

      if (formData.is_trainer) {
        submitData.trainer_data = {
          bio: formData.bio,
          years_of_experience: parseInt(formData.years_of_experience) || 0,
          specialty_strength: formData.specialty_strength,
          specialty_cardio: formData.specialty_cardio,
          specialty_flexibility: formData.specialty_flexibility,
          specialty_sports: formData.specialty_sports,
          specialty_rehabilitation: formData.specialty_rehabilitation,
          certifications: selectedCertifications.join(', '), // Join selected certs
        };
      }

      const response = await fetch('http://localhost:8000/api/auth/signup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Account created successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: 'Something went wrong. Please try again.' });
        }
      }
    } catch (error) {
      setErrors({ general: 'Failed to connect to server. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-container">
      {/* Left Side - Gym Image with Diagonal Overlay */}
      <div className="signup-left">
        <div className="gym-image"></div>
        <div className="diagonal-overlay"></div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="signup-right">
        <div className="signup-box">
          {/* Logo */}
          <div className="logo-container">
            <Logo variant="full" size="md" />
          </div>

          {/* Header */}
          <div className="signup-header">
            <h2 className="signup-title">Create your account</h2>
            <p className="signup-subtitle">
              Already have an account?{' '}
              <Link href="/login" className="signup-link">
                Sign in
              </Link>
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="alert alert-success">
              <p className="alert-text">{successMessage}</p>
            </div>
          )}

          {/* General Error */}
          {errors.general && (
            <div className="alert alert-error">
              <p className="alert-text">{errors.general}</p>
            </div>
          )}

          {/* Form */}
          <form className="signup-form" onSubmit={handleSubmit}>
            {/* Row 1: Username & Email */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username<span className="required-asterisk">*</span>
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className={`form-input ${errors.username ? 'error' : ''}`}
                  placeholder="Choose a username"
                />
                {errors.username && (
                  <p className="form-error">{errors.username}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email<span className="required-asterisk">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="form-error">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Row 2: First Name & Last Name */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="first_name" className="form-label">
                  First Name<span className="required-asterisk">*</span>
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                  className={`form-input ${errors.first_name ? 'error' : ''}`}
                  placeholder="Zoro"
                />
                {errors.first_name && (
                  <p className="form-error">{errors.first_name}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="last_name" className="form-label">
                  Last Name<span className="required-asterisk">*</span>
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                  className={`form-input ${errors.last_name ? 'error' : ''}`}
                  placeholder="Roronoa"
                />
                {errors.last_name && (
                  <p className="form-error">{errors.last_name}</p>
                )}
              </div>
            </div>

            {/* Row 3: Password & Confirm Password */}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password<span className="required-asterisk">*</span>
                </label>
                <div className="password-field-wrapper">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setShowPasswordRequirements(true)}
                    onBlur={() => setTimeout(() => setShowPasswordRequirements(false), 200)}
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="Enter a password"
                  />
                  <PasswordRequirements 
                    password={formData.password} 
                    isVisible={showPasswordRequirements}
                  />
                </div>
                {errors.password && (
                  <p className="form-error">{errors.password}</p>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password2" className="form-label">
                  Confirm<span className="required-asterisk">*</span>
                </label>
                <input
                  id="password2"
                  name="password2"
                  type="password"
                  required
                  value={formData.password2}
                  onChange={handleChange}
                  className={`form-input ${errors.password2 ? 'error' : ''}`}
                  placeholder="Confirm your password"
                />
                {errors.password2 && (
                  <p className="form-error">{errors.password2}</p>
                )}
              </div>
            </div>

            {/* Is Trainer Checkbox */}
            <div className="checkbox-group">
              <input
                id="is_trainer"
                name="is_trainer"
                type="checkbox"
                checked={formData.is_trainer}
                onChange={handleChange}
                className="form-checkbox"
              />
              <label htmlFor="is_trainer" className="checkbox-label">
                I am a fitness trainer
              </label>
            </div>

            {/* Trainer-specific fields */}
            {formData.is_trainer && (
              <div className="trainer-fields">
                <h3 className="trainer-fields-title">Trainer Information</h3>

                {/* Bio */}
                <div className="form-group">
                  <label htmlFor="bio" className="form-label">
                    Bio<span className="required-asterisk">*</span>
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    required={formData.is_trainer}
                    value={formData.bio}
                    onChange={handleChange}
                    maxLength={500}
                    className={`form-textarea ${errors.bio ? 'error' : ''}`}
                    placeholder="Tell us a bit about yourself."
                  />
                  <div className="character-counter">
                    {formData.bio.length}/500
                  </div>
                  {errors.bio && (
                    <p className="form-error">{errors.bio}</p>
                  )}
                </div>

                {/* Years of Experience */}
                <div className="form-group">
                  <label htmlFor="years_of_experience" className="form-label">
                    Years of Experience<span className="required-asterisk">*</span>
                  </label>
                  <input
                    id="years_of_experience"
                    name="years_of_experience"
                    type="number"
                    min="0"
                    max="50"
                    required={formData.is_trainer}
                    value={formData.years_of_experience}
                    onChange={handleChange}
                    className={`form-input ${errors.years_of_experience ? 'error' : ''}`}
                    placeholder="e.g., 5"
                  />
                  {errors.years_of_experience && (
                    <p className="form-error">{errors.years_of_experience}</p>
                  )}
                </div>

                {/* Specialties */}
                <div className="form-group">
                  <label className="form-label">
                    Specialties<span className="required-asterisk">*</span>
                  </label>
                  <div className="specialties-grid">
                    <div className="specialty-item">
                      <input
                        id="specialty_strength"
                        name="specialty_strength"
                        type="checkbox"
                        checked={formData.specialty_strength}
                        onChange={handleChange}
                        className="specialty-checkbox"
                      />
                      <label htmlFor="specialty_strength" className="specialty-label">
                        Strength
                      </label>
                    </div>
                    <div className="specialty-item">
                      <input
                        id="specialty_cardio"
                        name="specialty_cardio"
                        type="checkbox"
                        checked={formData.specialty_cardio}
                        onChange={handleChange}
                        className="specialty-checkbox"
                      />
                      <label htmlFor="specialty_cardio" className="specialty-label">
                        Cardio
                      </label>
                    </div>
                    <div className="specialty-item">
                      <input
                        id="specialty_flexibility"
                        name="specialty_flexibility"
                        type="checkbox"
                        checked={formData.specialty_flexibility}
                        onChange={handleChange}
                        className="specialty-checkbox"
                      />
                      <label htmlFor="specialty_flexibility" className="specialty-label">
                        Flexibility
                      </label>
                    </div>
                    <div className="specialty-item">
                      <input
                        id="specialty_sports"
                        name="specialty_sports"
                        type="checkbox"
                        checked={formData.specialty_sports}
                        onChange={handleChange}
                        className="specialty-checkbox"
                      />
                      <label htmlFor="specialty_sports" className="specialty-label">
                        Sports
                      </label>
                    </div>
                    <div className="specialty-item">
                      <input
                        id="specialty_rehabilitation"
                        name="specialty_rehabilitation"
                        type="checkbox"
                        checked={formData.specialty_rehabilitation}
                        onChange={handleChange}
                        className="specialty-checkbox"
                      />
                      <label htmlFor="specialty_rehabilitation" className="specialty-label">
                        Rehab
                      </label>
                    </div>
                  </div>
                  {errors.specialties && (
                    <p className="form-error">{errors.specialties}</p>
                  )}
                </div>

                {/* Certifications Multi-Select Dropdown */}
                <div className="form-group">
                  <label className="form-label">
                    Certifications
                  </label>
                  
                  {/* Selected Certifications Display */}
                  {selectedCertifications.length > 0 && (
                    <div className="cert-chips-container">
                      {selectedCertifications.map((cert) => (
                        <div key={cert} className="cert-chip">
                          <span className="cert-chip-text">{cert}</span>
                          <button
                            type="button"
                            className="cert-chip-remove"
                            onClick={() => handleRemoveCertification(cert)}
                            aria-label={`Remove ${cert}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Dropdown Button */}
                  <div className="cert-dropdown-wrapper">
                    <button
                      type="button"
                      className="cert-dropdown-button"
                      onClick={() => setShowCertDropdown(!showCertDropdown)}
                    >
                      {selectedCertifications.length === 0 
                        ? 'Select certifications...' 
                        : `${selectedCertifications.length} selected`}
                      <span className="dropdown-arrow">▼</span>
                    </button>

                    {/* Dropdown List */}
                    {showCertDropdown && (
                      <div className="cert-dropdown-menu">
                        {CERTIFICATIONS.map((cert) => (
                          <label key={cert} className="cert-dropdown-item">
                            <input
                              type="checkbox"
                              checked={selectedCertifications.includes(cert)}
                              onChange={() => handleCertificationToggle(cert)}
                              className="cert-checkbox"
                            />
                            <span className="cert-name">{cert}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {errors.certifications && (
                    <p className="form-error">{errors.certifications}</p>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="submit-button"
            >
              {isLoading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
