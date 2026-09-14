import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/options";
import { ScanBarcodeSchema } from "@/server/validations";
import { ScannerService } from "@/server/services/scanner.service";
import { checkRateLimit } from "@/server/security/rate-limiter";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED: Please sign in" }, { status: 401 });
    }

    const rateLimit = checkRateLimit(`scan:${session.user.id}`, 60, 60000);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Scan rate limit exceeded" }, { status: 429 });
    }

    const body = await req.json();
    const { shoppingSessionId, barcode } = ScanBarcodeSchema.parse(body);

    const scanResult = await ScannerService.scanBarcode(shoppingSessionId, barcode, session.user.id);

    return NextResponse.json(scanResult);
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Barcode scan failed";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
