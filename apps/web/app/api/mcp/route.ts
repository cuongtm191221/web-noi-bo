import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Use bracket notation because Prisma keeps snake_case model names
const mcpTokens = prisma['mcp_tokens'] as any;

async function verifyMcpToken(token: string): Promise<string | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const mcpToken = await mcpTokens.findUnique({
      where: { tokenHash },
      select: { userId: true },
    });

    if (mcpToken) {
      await mcpTokens.update({
        where: { tokenHash },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});
      return mcpToken.userId;
    }
  } catch (e) {
    console.error('Token verify error:', e);
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

async function handleSearchDocuments(query: string, limit: number = 10) {
  try {
    const documents = await prisma.documents.findMany({
      where: {
        status: 'published',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });

    if (!documents.length) {
      return `Không tìm thấy tài liệu nào cho từ khóa: ${query}`;
    }

    const results = documents.map((doc, i) =>
      `[${i + 1}] ${doc.title}\n    ID: ${doc.id}\n    Description: ${doc.description || 'N/A'}...`
    ).join('\n\n');

    return `Tìm thấy ${documents.length} tài liệu:\n\n${results}`;
  } catch (error) {
    console.error('Search error:', error);
    return `Lỗi tìm kiếm: ${error}`;
  }
}

async function handleGetDocument(docId: string) {
  try {
    const doc = await prisma.documents.findUnique({
      where: { id: docId },
      include: {
        categories: { select: { name: true } },
        document_chunks: {
          orderBy: { chunkIndex: 'asc' },
          take: 5,
          select: { chunkIndex: true, text: true, pageNumber: true },
        },
      },
    });

    if (!doc) {
      return `Không tìm thấy tài liệu với ID: ${docId}`;
    }

    let result = [
      `Tài liệu: ${doc.title}`,
      `ID: ${doc.id}`,
      `Trạng thái: ${doc.status}`,
      `Danh mục: ${doc.categories?.name || 'N/A'}`,
      `Tạo: ${doc.createdAt}`,
      `Cập nhật: ${doc.updatedAt}`,
      ``,
      `Nội dung (${doc.document_chunks.length} phần đầu):`,
    ];

    for (const chunk of doc.document_chunks) {
      const text = chunk.text.length > 500 ? chunk.text.slice(0, 500) + '...' : chunk.text;
      result.push(`\n--- Phần ${chunk.pageNumber || chunk.chunkIndex} ---`);
      result.push(text);
    }

    return result.join('\n');
  } catch (error) {
    console.error('Get document error:', error);
    return `Lỗi lấy tài liệu: ${error}`;
  }
}

async function handleListCategories() {
  try {
    const categories = await prisma.categories.findMany({
      include: {
        _count: {
          select: { documents: { where: { status: 'published' } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    if (!categories.length) {
      return "Chưa có danh mục nào.";
    }

    return categories.map(c =>
      `- [${c.color || '#666'}] ${c.name}: ${c._count.documents} tài liệu`
    ).join('\n');
  } catch (error) {
    console.error('List categories error:', error);
    return `Lỗi lấy danh mục: ${error}`;
  }
}

async function handleGetSummary(docId: string) {
  try {
    const summary = await prisma.document_summaries.findUnique({
      where: { documentId: docId },
    });

    if (!summary) {
      return `Tài liệu ${docId} chưa có tóm tắt.`;
    }

    return [
      "=== TÓM TẮT ===",
      summary.executive_summary || "Không có tóm tắt.",
      "",
      "=== CHECKLIST ===",
      JSON.stringify(summary.checklist || "Không có checklist."),
      "",
      "=== FLOWCHART ===",
      "```mermaid",
      summary.mermaid_syntax || "# Không có flowchart",
      "```",
    ].join('\n');
  } catch (error) {
    console.error('Get summary error:', error);
    return `Lỗi lấy tóm tắt: ${error}`;
  }
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

    try {
      if (method === "tools/list") {
        const result = await handleListTools();
        return NextResponse.json({ jsonrpc: '2.0', id, result });

      } else if (method === "tools/call") {
        const { name, arguments: args = {} } = params || {};

        let result: string;
        switch (name) {
          case "search_documents":
            result = await handleSearchDocuments(args.query || '', args.limit || 10);
            break;
          case "get_document":
            result = await handleGetDocument(args.id || '');
            break;
          case "list_categories":
            result = await handleListCategories();
            break;
          case "get_summary":
            result = await handleGetSummary(args.id || '');
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
