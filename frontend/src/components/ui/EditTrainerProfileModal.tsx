'use client';

import { useState, useEffect } from 'react';
import { trainerAPI, ApiError } from '@/library/api';
import './EditTrainerProfileModal.css';

// copying the certs array from signup
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

type TrainerProfileData = {
  bio: string;
  years_of_experience: number;
  specialty_strength: boolean;
  specialty_cardio: boolean;
  specialty_flexibility: boolean;
  specialty_sports: boolean;
  specialty_rehabilitation: boolean;
  certifications: string;
};

type EditTrainerProfileModalProps = {
  currentData: TrainerProfileData;
  onClose: () => void;
  onSave: (data: TrainerProfileData) => void;
};

export default function EditTrainerProfileModal({
  currentData,
  onClose,
  onSave,
}: EditTrainerProfileModalProps) {
  const [form, setForm] = useState<TrainerProfileData>(currentData);
  const [selectedCertifications, setSelectedCertifications] = useState<string[]>([]);
  const [showCertDropdown, setShowCertDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Parse certs string into array
  useEffect(() => {
    if (currentData.certifications) {
      const certs = currentData.certifications
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0);
      setSelectedCertifications(certs);
    }
  }, [currentData.certifications]);

  const setField = <K extends keyof TrainerProfileData>(
    name: K,
    value: TrainerProfileData[K]
  ) => {
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
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
  };

  // Remove certification chip
  const handleRemoveCertification = (cert: string) => {
    setSelectedCertifications(prev => prev.filter(c => c !== cert));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    // Validate at least one specialty
    const hasSpecialty = form.specialty_strength || 
                        form.specialty_cardio || 
                        form.specialty_flexibility || 
                        form.specialty_sports || 
                        form.specialty_rehabilitation;

    if (!hasSpecialty) {
      setErrors({ specialties: 'Please select at least one specialty' });
      setSaving(false);
      return;
    }

    try {
      // Join certifications array into comma-separated string
      const dataToSave = {
        ...form,
        certifications: selectedCertifications.join(', '),
      };

      const updated = await trainerAPI.updateTrainerProfile(dataToSave);
      onSave(updated);
    } catch (e) {
      if (e instanceof ApiError && e.errors) {
        setErrors(e.errors);
      } else if (e instanceof ApiError) {
        setErrors({ detail: e.message });
      } else {
        setErrors({ detail: 'Something went wrong' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content trainer-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit Trainer Profile</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSave} className="modal-form">
          {errors.detail && <div className="modal-alert error">{errors.detail}</div>}

          {/* Bio */}
          <div className="modal-field">
            <label className="modal-label" htmlFor="bio">
              Bio<span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              id="bio"
              className="modal-textarea"
              value={form.bio}
              onChange={(e) => setField('bio', e.target.value)}
              placeholder="Tell us about your training philosophy..."
              rows={4}
              maxLength={500}
              required
            />
            <div className="char-count">{form.bio.length}/500</div>
            {errors.bio && <div className="modal-error">{errors.bio}</div>}
          </div>

          {/* Years of Experience */}
          <div className="modal-field">
            <label className="modal-label" htmlFor="years_of_experience">
              Years of Experience<span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="years_of_experience"
              type="number"
              className="modal-input"
              value={form.years_of_experience}
              onChange={(e) => setField('years_of_experience', parseInt(e.target.value) || 0)}
              min={0}
              max={50}
              required
            />
            {errors.years_of_experience && (
              <div className="modal-error">{errors.years_of_experience}</div>
            )}
          </div>

          {/* Specialties */}
          <div className="modal-field">
            <label className="modal-label">
              Specialties<span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div className="checkbox-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.specialty_strength}
                  onChange={(e) => setField('specialty_strength', e.target.checked)}
                />
                <span>Strength Training</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.specialty_cardio}
                  onChange={(e) => setField('specialty_cardio', e.target.checked)}
                />
                <span>Cardio</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.specialty_flexibility}
                  onChange={(e) => setField('specialty_flexibility', e.target.checked)}
                />
                <span>Flexibility</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.specialty_sports}
                  onChange={(e) => setField('specialty_sports', e.target.checked)}
                />
                <span>Sports Training</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.specialty_rehabilitation}
                  onChange={(e) => setField('specialty_rehabilitation', e.target.checked)}
                />
                <span>Rehabilitation</span>
              </label>
            </div>
            {errors.specialties && <div className="modal-error">{errors.specialties}</div>}
          </div>

          {/* Certifications Dropdown (Same as Signup) */}
          <div className="modal-field">
            <label className="modal-label">Certifications</label>
            
            {/* Selected Certifications Chips */}
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
              <div className="modal-error">{errors.certifications}</div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="modal-actions">
            <button
              type="button"
              className="modal-button-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="modal-button" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
