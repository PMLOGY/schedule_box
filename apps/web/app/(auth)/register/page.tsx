import { type Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Register | ScheduleBox',
};

export default function RegisterPage() {
  return <RegisterForm />;
}
