import { z } from "zod";

export const exerciseSchema = z.object({
  name: z.string().trim().min(2, "Enter an exercise name"),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  muscleGroup: z.string().trim().max(80).optional().or(z.literal("")),
  equipment: z.string().trim().max(80).optional().or(z.literal("")),
  instructions: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type ExerciseInput = z.infer<typeof exerciseSchema>;
