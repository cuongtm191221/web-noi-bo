// docker exec rikkei-web sh -c 'cat > apps/web/app/api/test/route.ts << "ENDOFFILE"
  import { NextResponse } from "next/server";
  import { prisma } from "@/lib/prisma";
  import crypto from "crypto";

  export async function GET() {
    const token = "rik_8jy9mstt_9_LC3zGu5N2md0MPuxdDQbVtE5Tzh3gz";
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    
    try {
      const mcpTokens = prisma["mcp_tokens"];
      const result = await mcpTokens.findUnique({
        where: { tokenHash },
      });
      return NextResponse.json({ success: true, found: !!result, hash: tokenHash.substring(0, 20) });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message, keys: Object.keys(prisma) });
    }
  }
  ENDOFFILE'
  // docker restart rikkei-web
  // sleep 10
  // curl -s http://localhost:3000/api/test