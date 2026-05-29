import { z } from 'zod'

export const profileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  bio: z.string().optional(),
  phoneNumber: z.string().optional(),
  fax: z.string().optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
