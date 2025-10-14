'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthTabs from './components/AuthTabs';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import { validateSession } from './lib/auth-client';

export default function AuthPage() {
	const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const checkAuthStatus = async () => {
			try {
				const result = await validateSession();
				if (result.success && result.user) {
					// User is already logged in, redirect to home page
					router.push('/');
					return;
				}
			} catch (error) {
				console.error('Failed to check auth status:', error);
			} finally {
				setIsLoading(false);
			}
		};

		checkAuthStatus();
	}, [router]);

	const handleError = (errorMessage: string) => {
		setError(errorMessage);
		// Clear error after 5 seconds
		setTimeout(() => setError(null), 5000);
	};

	const handleTabChange = (tab: 'login' | 'signup') => {
		setActiveTab(tab);
		// Clear any existing errors when switching tabs
		setError(null);
	};

	// Show loading state while checking authentication
	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-2 text-gray-600">Checking authentication status...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold">
						{activeTab === 'login' ? 'Sign in to your account' : 'Create your account'}
					</h2>
				</div>

				<div className="bg-white py-8 px-6 shadow-md rounded-lg">
					{/* Error display */}
					{error && (
						<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
							<p className="text-sm text-red-600">{error}</p>
						</div>
					)}

					{/* Tab navigation */}
					<AuthTabs activeTab={activeTab} onTabChange={handleTabChange} />

					{/* Form content */}
					<div className="mt-6">
						{activeTab === 'login' ? (
							<LoginForm onError={handleError} />
						) : (
							<SignupForm onError={handleError} />
						)}
					</div>
				</div>
			</div>
		</div>
	);
}