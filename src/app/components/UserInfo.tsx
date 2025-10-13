'use client';

import { useEffect, useState } from 'react';
import { validateSession } from '../auth/lib/auth-client';

interface UserInfo {
	id: string;
	username: string;
	createdAt: string;
}

export default function UserInfo() {
	const [user, setUser] = useState<UserInfo | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const checkSession = async () => {
			try {
				const result = await validateSession();
				if (result.success && result.user) {
					setUser(result.user);
				}
			} catch (error) {
				console.error('Failed to validate session:', error);
			} finally {
				setIsLoading(false);
			}
		};

		checkSession();
	}, []);

	if (isLoading) {
		return <div>Loading...</div>;
	}

	if (!user) {
		return (
			<div className="flex flex-col items-center gap-4">
				<p>Not logged in</p>
				<a
					href="/auth"
					className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
				>
					Login / Sign Up
				</a>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center gap-4">
			<p>Logged in as: <span className="font-semibold">{user.username}</span></p>
			<a
				href="/api/auth/session"
				className="text-sm text-gray-500 hover:text-gray-700"
				onClick={async (e) => {
					e.preventDefault();
					try {
						await fetch('/api/auth/session', { method: 'DELETE' });
						window.location.href = '/auth';
					} catch (error) {
						console.error('Logout failed:', error);
					}
				}}
			>
				Logout
			</a>
		</div>
	);
}