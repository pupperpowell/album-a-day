import UserInfo from "../components/UserInfo";
import MusicSearch from "../components/MusicSearch";

export default function Test() {
	return (
		<div className="font-sans min-h-screen p-4 sm:p-8">
			<div className="max-w-6xl mx-auto">
				<header className="mb-8 text-center">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Album-a-Day</h1>
					<p className="text-gray-600">Discover new music every day</p>
				</header>

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
					<div className="lg:col-span-1">
						<UserInfo />
					</div>

					<div className="lg:col-span-3">
						<MusicSearch />
					</div>
				</div>
			</div>
		</div>
	);
}
