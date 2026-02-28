import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";

export async function POST(request: NextRequest) {
  try {
    const { eventIndex } = await request.json();

    if (typeof eventIndex !== "number" || eventIndex < 0) {
      return NextResponse.json(
        { error: "eventIndex deve essere un numero >= 0" },
        { status: 400 }
      );
    }

    // keep eventIndex in festivalStatus as well in case this endpoint is used directly
    const status = await prisma.festivalStatus.update({
      where: { id: 1 },
      data: { eventIndex },
    });
    // trigger a pusher update so clients can react immediately
    await pusher.trigger("festival", "status-update", { eventIndex });

    return NextResponse.json(status);
  } catch (error) {
    console.error("Errore aggiornamento evento:", error);
    return NextResponse.json(
      { error: "Errore nell'aggiornamento dell'evento" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const status = await prisma.festivalStatus.findUnique({
      where: { id: 1 },
      select: { eventIndex: true },
    });

    return NextResponse.json({ eventIndex: status?.eventIndex ?? 0 });
  } catch (error) {
    console.error("Errore lettura evento:", error);
    return NextResponse.json(
      { error: "Errore nella lettura dell'evento" },
      { status: 500 }
    );
  }
}
