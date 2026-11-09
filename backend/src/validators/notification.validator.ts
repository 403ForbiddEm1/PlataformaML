// src/validators/notification.validator.ts
import { z } from 'zod';

export const sendNotificationSchema = z.object({
  recipient: z.string().min(1, 'El destinatario es obligatorio'),
  channel: z.enum(['WhatsApp', 'Email']),
  title: z.string().min(1, 'El título es obligatorio'),
  message: z.string().min(1, 'El mensaje es obligatorio'),
  relatedApplicationId: z.string().optional(),
});
