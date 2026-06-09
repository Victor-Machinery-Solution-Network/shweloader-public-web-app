import { NextResponse } from "next/server";
import { getBusinessTypes } from "@/lib/api/business-types";
import { getPartnerTypes } from "@/lib/api/partner-types";
import { getLocations } from "@/lib/api/locations";

/**
 * Public reference data for the signup onboarding ("business details") step:
 * business types, partner types, and the state→district→township tree. The auth
 * modal is a client component and can't call the server-only API client directly,
 * so it fetches this route. Each getter is `"use cache"`d, so this is cheap.
 */
export async function GET() {
  try {
    const [businessTypes, partnerTypes, locations] = await Promise.all([
      getBusinessTypes(),
      getPartnerTypes(),
      getLocations(),
    ]);
    return NextResponse.json({ businessTypes, partnerTypes, locations });
  } catch {
    return NextResponse.json(
      { businessTypes: [], partnerTypes: [], locations: [] },
      { status: 502 },
    );
  }
}
