'use client';

import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export interface FeedbackData {
  difficulty_rating?: number;
  fatigue_level?: number | null;
  pain_reported?: boolean;
  notes?: string;
}

export interface UseWorkoutFeedbackOptions {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onAfterSubmit?: (dateStr: string, painReported: boolean, wasEditing: boolean) => void;
  onAfterDelete?: (dateStr: string) => void;
}

export function useWorkoutFeedback(options: UseWorkoutFeedbackOptions) {
  const { onSuccess, onError, onAfterSubmit, onAfterDelete } = options;

  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackFatigue, setFeedbackFatigue] = useState<number | null>(null);
  const [feedbackPain, setFeedbackPain] = useState(false);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState(false);

  const resetFeedbackForm = () => {
    setFeedbackRating(0);
    setFeedbackFatigue(null);
    setFeedbackPain(false);
    setFeedbackNotes('');
    setEditingFeedback(false);
  };

  const loadExistingFeedback = (feedback: FeedbackData) => {
    setFeedbackRating(feedback.difficulty_rating ?? 0);
    setFeedbackFatigue(feedback.fatigue_level ?? null);
    setFeedbackPain(feedback.pain_reported ?? false);
    setFeedbackNotes(feedback.notes ?? '');
    setEditingFeedback(true);
    setShowFeedbackForm(true);
  };

  const submitFeedback = async (dateStr: string) => {
    if (feedbackRating === 0) {
      onError('Please rate the difficulty before submitting.');
      return;
    }
    setSubmittingFeedback(true);
    try {
      const body: Record<string, any> = {
        difficulty_rating: feedbackRating,
        pain_reported: feedbackPain,
        notes: feedbackNotes,
      };
      if (feedbackFatigue !== null) body.fatigue_level = feedbackFatigue;

      const method = editingFeedback ? 'PATCH' : 'POST';
      const res = await fetch(`${API_BASE}/api/sessions/feedback/${dateStr}/`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to submit feedback');

      onSuccess(editingFeedback ? 'Feedback updated! \u270F\uFE0F' : 'Feedback submitted! \uD83D\uDE4C');

      const wasEditing = editingFeedback;
      const painReported = feedbackPain;
      setShowFeedbackForm(false);
      resetFeedbackForm();

      onAfterSubmit?.(dateStr, painReported, wasEditing);
    } catch {
      onError('Could not submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const deleteFeedback = async (dateStr: string) => {
    setDeletingFeedback(true);
    try {
      const res = await fetch(`${API_BASE}/api/sessions/feedback/${dateStr}/`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete feedback');
      onSuccess('Feedback removed.');
      setShowFeedbackForm(false);
      resetFeedbackForm();
      onAfterDelete?.(dateStr);
    } catch {
      onError('Could not remove feedback.');
    } finally {
      setDeletingFeedback(false);
    }
  };

  return {
    showFeedbackForm,
    setShowFeedbackForm,
    editingFeedback,
    feedbackRating,
    setFeedbackRating,
    feedbackFatigue,
    setFeedbackFatigue,
    feedbackPain,
    setFeedbackPain,
    feedbackNotes,
    setFeedbackNotes,
    submittingFeedback,
    deletingFeedback,
    resetFeedbackForm,
    loadExistingFeedback,
    submitFeedback,
    deleteFeedback,
  };
}
