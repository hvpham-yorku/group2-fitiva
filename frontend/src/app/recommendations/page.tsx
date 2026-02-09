"use client";

import { useEffect, useState } from "react";
import { workoutAPI } from "@/library/api";

type Workout = {
  id: number;
  name: string;
  goal: string;
  level: string;
  duration: number;
};

export default function RecommendationsPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workoutAPI
      .getRecommendations()
      .then((data) => setWorkouts(data as Workout[]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="w-full max-w-4xl rounded-lg bg-white p-10 shadow-sm dark:bg-black">
        <h1 className="mb-2 text-2xl font-semibold text-black dark:text-white">
          Workout Recommendations
        </h1>

        <p className="mb-8 text-sm text-zinc-600 dark:text-zinc-400">
          Personalized workouts based on your fitness profile
        </p>

        {loading && (
          <p className="text-zinc-600 dark:text-zinc-400">
            Loading recommendations...
          </p>
        )}

        {!loading && workouts.length === 0 && (
          <p className="text-zinc-600 dark:text-zinc-400">
            No recommendations available yet.
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {workouts.map((w) => (
            <div
              key={w.id}
              className="rounded-lg border border-zinc-200 p-6 dark:border-zinc-800"
            >
              <h3 className="mb-2 text-lg font-medium text-black dark:text-white">
                {w.name}
              </h3>

              <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                <p>
                  <span className="font-medium">Goal:</span> {w.goal}
                </p>
                <p>
                  <span className="font-medium">Level:</span> {w.level}
                </p>
                <p>
                  <span className="font-medium">Duration:</span> {w.duration} minutes
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
