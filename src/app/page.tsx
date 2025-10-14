"use client"

import Link from 'next/link';
import { useEffect, useState } from 'react';

const albumArtFiles = [
	'3eafe04f-638a-4b13-a004-81ae4360b168.jpg',
	'4a0356cf-5b7d-4ea5-bc3b-be33931b349e.jpg',
	'5be85dd3-7245-4120-b9f6-04ef2424b00f.jpg',
	'6ed335dd-3bab-4aa8-b7d1-0432281786f6.jpg',
	'8e4de7b3-e107-4545-a5ce-7190086b1f2b.jpg',
	'19d9f5e1-d356-4aa0-842f-3b63a5bb6664.jpg',
	'75b99138-5873-4025-80e9-c06d71ea7d17.jpg',
	'76df3287-6cda-33eb-8e9a-044b5e15ffdd.jpg',
	'98db16e3-452b-4501-8060-ba655c0295ad.jpg',
	'441d6cb5-95bd-41d6-9c49-497acee27f77.jpg',
	'442f4465-31b0-457f-8434-2d1acf82adcc.jpg',
	'626a8da5-0d07-4919-a39d-c47a979b3b3b.jpg',
	'775f4bd8-ddb7-4a90-be77-a5948572b2be.jpg',
	'913b7dae-086b-4230-af1c-19dcd4c04bf0.jpg',
	'6921a330-b6c5-4f74-ba87-b46ae2544bc2.jpg',
	'7548d627-b640-456e-956b-adf80d55cb78.jpg',
	'66180f91-f9eb-439b-9de6-d332964d50b8.jpg',
	'ba5b1afe-e6f5-4a41-af89-21cda404e3ab.jpg',
	'ca1fe3e0-69f6-42fd-a9f6-1eadf43fbfbe.jpg'
];

function getRandomItems(array: string[], count: number) {
	const shuffled = [...array].sort(() => 0.5 - Math.random());
	return shuffled.slice(0, count);
}

function getRandomPosition() {
	return {
		top: `${Math.random() * 80 + 10}%`,
		left: `${Math.random() * 80 + 10}%`,
		transform: `rotate(${Math.random() * 30 - 15}deg)`
	};
}

export default function Home() {
	const [randomAlbums, setRandomAlbums] = useState<Array<{ file: string; position: { top: string; left: string; transform: string } }>>([]);

	useEffect(() => {
		const selectedAlbums = getRandomItems(albumArtFiles, 0);
		const albums = selectedAlbums.map(file => ({
			file,
			position: getRandomPosition()
		}));
		setRandomAlbums(albums);
	}, []);

	return (
		<div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white dark:bg-gray-900 relative overflow-hidden">
			{/* Random album art images */}
			{randomAlbums.map((album, index) => (
				<img
					key={index}
					src={`/album-art/${album.file}`}
					alt="Album art"
					className="absolute w-44 h-44 object-cover rounded-lg shadow-lg opacity-25"
					style={{
						top: album.position.top,
						left: album.position.left,
						transform: album.position.transform,
						zIndex: 1
					}}
				/>
			))}

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
