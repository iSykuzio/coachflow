import { z } from "zod";

export const workoutSchema = z.object({
  name: z.string().trim().min(2, "Enter a workout name"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const workoutExerciseSchema = z.object({
  exerciseId: z.string().uuid("Choose an exercise"),
  sets: z.coerce.number().int().min(1, "Sets must be at least 1").max(20),
  reps: z.string().trim().min(1, "Enter reps, e.g. 8 or 8-12"),
  weight: z.string().trim().max(40).optional().or(z.literal("")),
  restSeconds: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value) => {
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    })
    .pipe(z.number().int().min(0).max(600).optional()),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const assignWorkoutSchema = z.object({
  workoutId: z.string().uuid("Choose a workout"),
  clientId: z.string().uuid("Choose a client"),
  dueDate: z.string().optional().or(z.literal("")),
});

export const setLogSchema = z.object({
  reps: z.string().trim().optional().or(z.literal("")),
  weight: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type WorkoutInput = z.infer<typeof workoutSchema>;
export type WorkoutExerciseInput = z.infer<typeof workoutExerciseSchema>;
export type AssignWorkoutInput = z.infer<typeof assignWorkoutSchema>;
