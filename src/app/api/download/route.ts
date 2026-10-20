import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file") || "packed";

  try {
    if (file === "debloat") {
      const filePath = path.join(process.cwd(), "wwwroot", "debloat_home.sh");
      const content = await fs.readFile(filePath, "utf-8");
      return new NextResponse(content, {
        headers: {
          "Content-Type": "text/x-shellscript; charset=utf-8",
          "Content-Disposition": 'attachment; filename="debloat_home.sh"',
        },
      });
    }

    const packedPath = path.join(process.cwd(), "dist", "woldenOs_packed.py");
    const content = await fs.readFile(packedPath, "utf-8");
    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/x-python; charset=utf-8",
        "Content-Disposition": 'attachment; filename="woldenOs_packed.py"',
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "File not found" },
      { status: 404 }
    );
  }
}
