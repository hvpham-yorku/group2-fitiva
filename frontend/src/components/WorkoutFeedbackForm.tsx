'use client';

import React from 'react';

interface WorkoutFeedbackFormProps {
  feedbackRating: number;
  setFeedbackRating: (n: number) => void;
  feedbackFatigue: number | null;
  setFeedbackFatigue: (n: number | null) => void;
  feedbackPain: boolean;
  setFeedbackPain: (v: boolean) => void;
  feedbackNotes: string;
  setFeedbackNotes: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
  isEditing: boolean;
}

export default function WorkoutFeedbackForm({
  feedbackRating,
  setFeedbackRating,
  feedbackFatigue,
  setFeedbackFatigue,
  feedbackPain,
  setFeedbackPain,
  feedbackNotes,
  setFeedbackNotes,
  onSubmit,
  onCancel,
  submitting,
  isEditing,
}: WorkoutFeedbackFormProps) {
  return (
    <div className="feedback-form">
      <div className="feedback-section">
        <label className="feedback-label">
          Difficulty <span className="feedback-required">*</span>
        </label>
        <div className="rating-buttons">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`rating-btn ${feedbackRating === n ? 'rating-btn-active' : ''}`}
              onClick={() => setFeedbackRating(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="rating-scale-labels">
          <span>Very Easy</span>
          <span>Very Hard</span>
        </div>
      </div>

      <div className="feedback-section">
        <label className="feedback-label">
          Fatigue Level <span className="feedback-optional">(optional)</span>
        </label>
        <div className="rating-buttons">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              className={`rating-btn ${feedbackFatigue === n ? 'rating-btn-active' : ''}`}
              onClick={() => setFeedbackFatigue(feedbackFatigue === n ? null : n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="rating-scale-labels">
          <span>Not Tired</span>
          <span>Exhausted</span>
        </div>
      </div>

      <div className="feedback-section feedback-section-inline">
        <label className="feedback-label">Any pain or discomfort?</label>
        <button
          className={`toggle-pain-btn ${feedbackPain ? 'toggle-pain-yes' : 'toggle-pain-no'}`}
          onClick={() => setFeedbackPain(!feedbackPain)}
        >
          {feedbackPain ? '\u26A0\uFE0F Yes' : 'No'}
        </button>
      </div>

      <div className="feedback-section">
        <label className="feedback-label">
          Notes <span className="feedback-optional">(optional)</span>
        </label>
        <textarea
          className="feedback-textarea"
          placeholder="How did it go? Any observations..."
          value={feedbackNotes}
          onChange={(e) => setFeedbackNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="feedback-actions">
        <button className="btn-skip-feedback" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-submit-feedback"
          onClick={onSubmit}
          disabled={feedbackRating === 0 || submitting}
        >
          {submitting ? 'Saving...' : isEditing ? '\u270F\uFE0F Update Feedback' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  );
}
