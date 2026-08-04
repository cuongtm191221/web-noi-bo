import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

async function verifyMcpToken(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const mcpToken = await prisma.mcpToken.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });

  if (mcpToken) {
    // Update last used
    await prisma.mcpToken.update({
      where: { tokenHash },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});
    return mcpToken.userId;
  }

  return null;
}

async function handleListTools() {
  return {
    tools: [
      {
        name: "search_documents",
        description: "Search documents by query string. Returns matching documents with snippets.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query string" },
            limit: { type: "integer", description: "Max results", default: 10 },
          },
          required: ["query"],
        },
      },
      {
        name: "get_document",
        description: "Get full document details including all chunks.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "Document ID" },
          },
          required: ["id"],
        },
      },
      {
        name: "list_categories",
        description: "List all document categories with document counts.",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "get_summary",
        description: "Get AI-generated summary + checklist + flowchart for a document.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "Document ID" },
          },
          required: ["id"],
        },
      },
    ]
  };
}

async function handleSearch(pool: any, query: string, limit: number = 10) {
  const rows = await pool.query(
    `SELECT id, title, LEFT(content_text, 200) as snippet
     FROM documents
     WHERE status = 'published'
     AND (title ILIKE $1 OR content_text ILIKE $1)
     ORDER BY updated_at DESC
     LIMIT $2`,
    [`%${query}%`, limit]
  );

  if (!rows.rows.length) {
    return `Không tìm thấy tài liệu nào cho từ khóa: ${query}`;
  }

  const results = rows.rows.map((row: any, i: number) =>
    `[${i + 1}] ${row.title}\n    ID: ${row.id}\n    Snippet: ${row.snippet}...`
  ).join('\n\n');

  return `Tìm thấy ${rows.rows.length} tài liệu:\n\n${results}`;
}

async function handleGetDocument(pool: any, docId: string) {
  const doc = await pool.query(
    `SELECT d.*, c.name as category_name
     FROM documents d
     LEFT JOIN categories c ON d.category_id = c.id
     WHERE d.id = $1`,
    [docId]
  );

  if (!doc.rows.length) {
    return `Không tìm thấy tài liệu với ID: ${docId}`;
  }

  const d = doc.rows[0];
  const chunks = await pool.query(
    `SELECT page_number, content_text FROM document_chunks WHERE document_id = $1 ORDER BY page_number LIMIT 5`,
    [docId]
  );

  let result = [
    `Tài liệu: ${d.title}`,
    `ID: ${d.id}`,
    `Trạng thái: ${d.status}`,
    `Danh mục: ${d.category_name || 'N/A'}`,
    `Tạo: ${d.created_at}`,
    `Cập nhật: ${d.updated_at}`,
    ``,
    `Nội dung (${chunks.rows.length} phần đầu):`,
  ];

  for (const chunk of chunks.rows) {
    const text = chunk.content_text.length > 500 ? chunk.content_text.slice(0, 500) + '...' : chunk.content_text;
    result.push(`\n--- Phần ${chunk.page_number} ---`);
    result.push(text);
  }

  return result.join('\n');
}

async function handleListCategories(pool: any) {
  const rows = await pool.query(
    `SELECT c.id, c.name, c.color, COUNT(d.id) as doc_count
     FROM categories c
     LEFT JOIN documents d ON c.id = d.category_id AND d.status = 'published'
     GROUP BY c.id, c.name, c.color
     ORDER BY c.name`
  );

  if (!rows.rows.length) {
    return "Chưa có danh mục nào.";
  }

  return rows.rows.map((r: any) =>
    `- [${r.color || '#666'}] ${r.name}: ${r.doc_count} tài liệu`
  ).join('\n');
}

async function handleGetSummary(pool: any, docId: string) {
  const summary = await pool.query(
    `SELECT executive_summary, checklist, flowchart_mermaid
     FROM document_summaries WHERE document_id = $1`,
    [docId]
  );

  if (!summary.rows.length) {
    return `Tài liệu ${docId} chưa có tóm tắt.`;
  }

  const s = summary.rows[0];
  return [
    "=== TÓM TẮT ===",
    s.executive_summary || "Không có tóm tắt.",
    "",
    "=== CHECKLIST ===",
    s.checklist || "Không có checklist.",
    "",
    "=== FLOWCHART ===",
    "```mermaid",
    s.flowchart_mermaid || "# Không có flowchart",
    "```",
  ].join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: null, error: { code: -32602, message: 'Missing Authorization header' } },
        { status: 401 }
      );
    }

    const userId = await verifyMcpToken(token);
    if (!userId) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: null, error: { code: -32602, message: 'Invalid or expired token' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { method, params, id } = body;

    const pool = (prisma as any).$connect;

    try {
      if (method === "tools/list") {
        const result = await handleListTools();
        return NextResponse.json({ jsonrpc: '2.0', id, result });

      } else if (method === "tools/call") {
        const { name, arguments: args = {} } = params || {};

        // Use Prisma transaction for queries
        const prismaClient = prisma.$defaultClient as any;

        let result: string;
        switch (name) {
          case "search_documents":
            result = await handleSearch(prismaClient, args.query || '', args.limit || 10);
            break;
          case "get_document":
            result = await handleGetDocument(prismaClient, args.id || '');
            break;
          case "list_categories":
            result = await handleListCategories(prismaClient);
            break;
          case "get_summary":
            result = await handleGetSummary(prismaClient, args.id || '');
            break;
          default:
            return NextResponse.json({
              jsonrpc: '2.0', id,
              error: { code: -32602, message: `Unknown tool: ${name}` }
            });
        }

        return NextResponse.json({
          jsonrpc: '2.0', id,
          result: { content: [{ type: "text", text: result }] }
        });

      } else if (method === "initialize") {
        return NextResponse.json({
          jsonrpc: '2.0', id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: "rikkei-docs-mcp", version: "1.0.0" }
          }
        });

      } else if (method === "ping") {
        return NextResponse.json({ jsonrpc: '2.0', id });

      } else {
        return NextResponse.json({
          jsonrpc: '2.0', id,
          error: { code: -32601, message: `Method not found: ${method}` }
        });
      }

    } catch (dbError) {
      console.error('MCP DB error:', dbError);
      return NextResponse.json({
        jsonrpc: '2.0', id,
        error: { code: -32603, message: `Database error: ${dbError}` }
      });
    }

  } catch (error) {
    console.error('MCP error:', error);
    return NextResponse.json({
      jsonrpc: '2.0', id: null,
      error: { code: -32603, message: `Internal error: ${error}` }
    }, { status: 500 });
  }
}
