"use client"

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {

	return (
		<div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white dark:bg-gray-900 relative overflow-hidden">

			{/*
				* Currently: Shows a static landing page
				* Future plan:
				* - If the user isn't logged in, show a fancy landing page
				* - If user is logged in, show their dashboard
				*/}

			{/* Main content */}
			<div className="text-center max-w-2xl mx-auto relative z-10">
				<h1 className="text-6xl font-bold text-gray-900 dark:text-white mb-8">
					albuma.day
				</h1>
				<p className="text-xl text-gray-600 dark:text-gray-300 mb-12 leading-relaxed">
					listen to one album a day, rate your favorites, share with friends
				</p>
				<div className="space-y-4">
					<Link href="auth">
						<button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
							Get Started
						</button>
					</Link>
				</div>
			</div>
		</div>
	);
}
