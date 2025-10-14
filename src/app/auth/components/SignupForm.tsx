'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signup, validateUsername } from '../lib/auth-client';

interface SignupFormProps {
	onError?: (error: string) => void;
}

export default function SignupForm({ onError }: SignupFormProps) {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [name, setName] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [fieldErrors, setFieldErrors] = useState<{
		username?: string;
		password?: string;
		confirmPassword?: string;
		name?: string;
	}>({});

	const router = useRouter();

	const validateForm = () => {
		const errors: { username?: string; password?: string; confirmPassword?: string; name?: string } = {};

		// Validate username using the auth client validation function
		const usernameValidation = validateUsername(username);
		if (!usernameValidation.isValid) {
			errors.username = usernameValidation.error;
		} else if (username.length < 3) {
			errors.username = 'Username must be at least 3 characters long';
		}

		if (!name.trim()) {
			errors.name = 'Name is required';
		}

		if (!password.trim()) {
			errors.password = 'Password is required';
		} else if (password.length < 6) {
			errors.password = 'Password must be at least 6 characters long';
		}

		if (!confirmPassword.trim()) {
			errors.confirmPassword = 'Please confirm your password';
		} else if (password !== confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
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
			const result = await signup(username, password, name);

			if (result.success) {
				// Redirect to home page on successful signup
				router.push('/');
				router.refresh();
			} else {
				onError?.(result.error || 'Signup failed');
			}
		} catch (error) {
			onError?.('An unexpected error occurred');
		} finally {
			setIsLoading(false);
		}
	};

	const handleInputChange = (field: 'username' | 'password' | 'confirmPassword' | 'name') => (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;

		if (field === 'username') {
			setUsername(value);
		} else if (field === 'password') {
			setPassword(value);
		} else if (field === 'confirmPassword') {
			setConfirmPassword(value);
		} else if (field === 'name') {
			setName(value);
		}

		// Clear field error when user starts typing
		if (fieldErrors[field]) {
			setFieldErrors(prev => ({ ...prev, [field]: undefined }));
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">
					Name
				</label>
				<input
					type="text"
					id="signup-name"
					value={name}
					onChange={handleInputChange('name')}
					className={`w-full px-3 py-2 text-black border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.name ? 'border-red-500' : 'border-gray-300'
						}`}
					disabled={isLoading}
				/>
				{fieldErrors.name && (
					<p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
				)}
			</div>

			<div>
				<label htmlFor="signup-username" className="block text-sm font-medium text-gray-700 mb-1">
					Username
				</label>
				<input
					type="text"
					id="signup-username"
					value={username}
					onChange={handleInputChange('username')}
					className={`w-full px-3 py-2 text-black border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.username ? 'border-red-500' : 'border-gray-300'
						}`}
					disabled={isLoading}
				/>
				{fieldErrors.username && (
					<p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
				)}
			</div>

			<div>
				<label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
					Password
				</label>
				<input
					type="password"
					id="signup-password"
					value={password}
					onChange={handleInputChange('password')}
					className={`w-full px-3 py-2 border text-black rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.password ? 'border-red-500' : 'border-gray-300'
						}`}
					disabled={isLoading}
				/>
				{fieldErrors.password && (
					<p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
				)}
			</div>

			<div>
				<label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
					Confirm Password
				</label>
				<input
					type="password"
					id="confirm-password"
					value={confirmPassword}
					onChange={handleInputChange('confirmPassword')}
					className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
						}`}
					disabled={isLoading}
				/>
				{fieldErrors.confirmPassword && (
					<p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
				)}
			</div>

			<button
				type="submit"
				disabled={isLoading}
				className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				{isLoading ? 'Creating account...' : 'Sign Up'}
			</button>
		</form>
	);
}