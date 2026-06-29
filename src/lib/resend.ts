import { Resend } from 'resend';

const resendApiKey = import.meta.env.RESEND_API_KEY || '';

export const resend = new Resend(resendApiKey);
