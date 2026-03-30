'use client';

import React from 'react';

interface FeedbackPayload {
  difficulty_rating?: number;
  fatigue_level?: number | null;
  pain_reported?: boolean;
  notes?: string;
}

interface WorkoutFeedbackSummaryProps {
  feedback: FeedbackPayload;
}

export default function WorkoutFeedbackSummary({
  feedback,
}: WorkoutFeedbackSummaryProps) {
  return (
    <div
      style={{
        background: 'var(--bg-tertiary)',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        margin: '0.75rem 0',
        border: '1px solid var(--border-light)',
      }}
    >
      <div
        style={{
          fontWeight: 700,
          marginBottom: '0.4rem',
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
        }}
      >
        YOUR FEEDBACK
      </div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.88rem' }}>
        <span>
          {'\uD83D\uDCAA'} Difficulty: <strong>{feedback.difficulty_rating}/5</strong>
        </span>
        {feedback.fatigue_level && (
          <span>
            {'\uD83D\uDE13'} Fatigue: <strong>{feedback.fatigue_level}/5</strong>
          </span>
        )}
        {feedback.pain_reported && (
          <span>
            {'\u26A0\uFE0F'} <strong>Pain reported</strong>
          </span>
        )}
      </div>
      {feedback.notes && (
        <p
          style={{
            marginTop: '0.4rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
          }}
        >
          &ldquo;{feedback.notes}&rdquo;
        </p>
      )}
    </div>
  );
}
