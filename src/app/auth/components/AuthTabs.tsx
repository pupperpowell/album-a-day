'use client';

interface AuthTabsProps {
	activeTab: 'login' | 'signup';
	onTabChange: (tab: 'login' | 'signup') => void;
}

export default function AuthTabs({ activeTab, onTabChange }: AuthTabsProps) {
	return (
		<div className="flex border-b border-gray-200 mb-6">
			<button
				className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${activeTab === 'login'
						? 'text-blue-600 border-b-2 border-blue-600'
						: 'text-gray-500 hover:text-gray-700'
					}`}
				onClick={() => onTabChange('login')}
			>
				Login
			</button>
			<button
				className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${activeTab === 'signup'
						? 'text-blue-600 border-b-2 border-blue-600'
						: 'text-gray-500 hover:text-gray-700'
					}`}
				onClick={() => onTabChange('signup')}
			>
				Sign Up
			</button>
		</div>
	);
}