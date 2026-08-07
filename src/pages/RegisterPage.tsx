import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { UserRole } from '../types';
import { registerUser } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { branding } from '../config/branding';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['customer', 'owner'] as const),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'customer',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      await registerUser(data.email, data.password, data.name, data.phone, data.role as UserRole);
      showToast('Registration successful!', 'success');

      // For customers, redirect to customer home (which will load the shop from localStorage)
      // This preserves the currentShopOwnerId that should have been set before registration
      if (data.role === 'customer') {
        // Check if we have a shop owner ID; if not, go back to determine it
        const ownerId = localStorage.getItem('currentShopOwnerId');
        if (ownerId) {
          navigate('/customer/home');
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Registration failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <img src={branding.logo} alt="logo" className="w-30 h-16 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-900">{branding.shopName}</h1>
          <p className="text-gray-600 text-sm mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Name"
            placeholder="Enter your name"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Phone"
            placeholder="Enter your phone number"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('role')}
            >
              <option value="customer">Customer</option>
              <option value="owner">Shop Owner</option>
            </select>
            {errors.role && <p className="text-red-600 text-sm mt-1">{errors.role.message}</p>}
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full">
            Create Account
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
