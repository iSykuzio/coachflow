import { z } from "zod";

export const inviteClientSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the client's full name"),
  email: z.string().trim().email("Enter a valid email address"),
});

export type InviteClientInput = z.infer<typeof inviteClientSchema>;
