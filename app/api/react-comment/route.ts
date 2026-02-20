import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { commentId, type } = await req.json(); // type: "like" | "dislike"

    if (!commentId || !type) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        likes: type === "like" ? { increment: 1 } : undefined,
        dislikes: type === "dislike" ? { increment: 1 } : undefined,
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}