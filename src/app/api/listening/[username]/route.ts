import { NextRequest, NextResponse } from "next/server";
import { ListenEventEntries } from "@/app/lib/ListenEvent-entries";

export async function GET(
	request: NextRequest,
	{ params }: { params: { username: string } }
) {
	try {
		const { username } = params;
		const { searchParams } = new URL(request.url);

		// Check if this is a request for a specific date
		const date = searchParams.get("date");

		if (date) {
			// Get specific day's entry
			if (!ListenEventEntries.validateDate(date)) {
				return NextResponse.json(
					{ error: "Date must be in YYYY-MM-DD format" },
					{ status: 400 }
				);
			}

			const entry = await ListenEventEntries.getListenEventEntryWithAlbum(username, date);

			if (!entry) {
				return NextResponse.json(
					{ error: "No ListenEvent entry found for this date" },
					{ status: 404 }
				);
			}

			return NextResponse.json({
				success: true,
				entry,
			});
		} else {
			// Get all entries for user
			const entries = await ListenEventEntries.getAllUserEntries(username);

			return NextResponse.json({
				success: true,
				entries,
				count: entries.length,
			});
		}
	} catch (error) {
		console.error("ListenEvent GET error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: { username: string } }
) {
	try {
		const { username } = params;
		const { searchParams } = new URL(request.url);
		const date = searchParams.get("date");

		if (!date) {
			return NextResponse.json(
				{ error: "Date parameter is required for deletion" },
				{ status: 400 }
			);
		}

		// Authenticate user - only allow users to delete their own entries
		const sessionId = request.cookies.get("session_id")?.value;
		if (!sessionId) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 }
			);
		}

		// Validate date format
		if (!ListenEventEntries.validateDate(date)) {
			return NextResponse.json(
				{ error: "Date must be in YYYY-MM-DD format" },
				{ status: 400 }
			);
		}

		// Check if entry exists
		const existingEntry = await ListenEventEntries.getListenEventEntry(username, date);
		if (!existingEntry) {
			return NextResponse.json(
				{ error: "No ListenEvent entry found for this date" },
				{ status: 404 }
			);
		}

		// Delete the entry
		const deleted = await ListenEventEntries.deleteListenEventEntry(username, date);

		if (!deleted) {
			return NextResponse.json(
				{ error: "Failed to delete ListenEvent entry" },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "ListenEvent entry deleted successfully",
		});
	} catch (error) {
		console.error("ListenEvent DELETE error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
