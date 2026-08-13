import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/firebase/auth";
import { getOwnedResponsesCsv } from "@/db/queries/responses";

type RouteContext = {
  params: Promise<{ formId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { formId } = await context.params;
  const result = await getOwnedResponsesCsv(formId, user.uid);

  if (!result) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  return new NextResponse(result.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
