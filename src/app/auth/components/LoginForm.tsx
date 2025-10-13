'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../lib/auth-client';

interface LoginFormProps {
	onError?: (error: string) => void;
}

export default function LoginForm({ onError }: LoginFormProps) {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<{
		username?: string;
		password?: string;
	}>({});

	const router = useRouter();

	const validateForm = () => {
		const errors: { username?: string; password?: string } = {};

		if (!username.trim()) {
			errors.username = 'Username is required';
		}

		if (!password.trim()) {
			errors.password = 'Password is required';
		}

		setFieldErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		setIsLoading(true);
		setFieldErrors({});

		try {
			const result = await login(username, password);

			if (result.success) {
				// Redirect to home page on successful login
				router.push('/');
				router.refresh();
			} else {
				onError?.(result.error || 'Login failed');
			}
		} catch (error) {
			onError?.('An unexpected error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	const handleInputChange = (field: 'username' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;

		if (field === 'username') {
			setUsername(value);
		} else {
			setPassword(value);
		}

		// Clear field error when user starts typing
		if (fieldErrors[field]) {
			setFieldErrors(prev => ({ ...prev, [field]: undefined }));
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
					Username
				</label>
				<input
					type="text"
					id="username"
					value={username}
					onChange={handleInputChange('username')}
					className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.username ? 'border-red-500' : 'border-gray-300'
						}`}
					disabled={isLoading}
				/>
				{fieldErrors.username && (
					<p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
				)}
			</div>

			<div>
				<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
					Password
				</label>
				<input
					type="password"
					id="password"
					value={password}
					onChange={handleInputChange('password')}
					className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'
						}`}
					disabled={isLoading}
				/>
				{fieldErrors.password && (
					<p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
				)}
			</div>

			<button
				type="submit"
				disabled={isLoading}
				className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{isLoading ? 'Logging in...' : 'Login'}
			</button>
		</form>
	);
}