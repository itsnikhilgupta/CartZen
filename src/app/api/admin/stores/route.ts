import { NextResponse } from "next/server";
import { requireStoreAdmin, requireStoreAccess } from "@/server/security/rbac";
import { StoreService } from "@/server/services/store.service";
import { StoreCreateUpdateSchema } from "@/server/validations";
import { Role } from "@/types/enums";

export async function GET() {
  try {
    const user = await requireStoreAdmin();

    let stores;
    if (user.role === Role.SUPER_ADMIN) {
      // Super Admin manages all stores globally
      stores = await StoreService.searchStores({});
    } else {
      // Store Admin manages ONLY stores assigned via StoreMembership
      const allStores = await StoreService.searchStores({});
      const accessibleStores = [];
      for (const store of allStores) {
        try {
          await requireStoreAccess(store.id);
          accessibleStores.push(store);
        } catch {
          // Exclude stores where user has no membership
        }
      }
      stores = accessibleStores;
    }

    return NextResponse.json({ stores });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to fetch admin store management list";
    return NextResponse.json({ error: errMessage }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireStoreAdmin();
    const body = await req.json();
    const validated = StoreCreateUpdateSchema.parse(body);

    if (body.id) {
      // Enforce cross-store data access check for updates
      await requireStoreAccess(body.id);
    }

    const store = await StoreService.createOrUpdateStore({
      id: body.id,
      ...validated,
    });

    return NextResponse.json({ success: true, store });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to create or update store";
    return NextResponse.json({ error: errMessage }, { status: 400 });
  }
}
