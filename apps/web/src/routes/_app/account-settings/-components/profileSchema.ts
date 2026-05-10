import { z } from 'zod'

export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  bio: z.string().optional(),
  phoneNumber: z.string().optional(),
  fax: z.string().optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
