import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

// Zod schema for diagram JSON (matches React Flow structure)
const DiagramNodeDataSchema = z.object({
  title: z.string().max(200),
  detail: z.string().max(4000).optional().default(''),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid bgColor (must be hex like #rrggbb)'),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid textColor (must be hex like #rrggbb)'),
  fontSize: z.number().int().min(8).max(48),
  fontWeight: z.enum(['400', '500', '600', '700', '800']),
  imageUrl: z.string().optional(),
});

const DiagramNodeSchema = z.object({
  id: z.string().max(64),
  type: z.enum(['default', 'diamond', 'ellipse', 'parallelogram']),
  position: z.object({ x: z.number(), y: z.number() }),
  data: DiagramNodeDataSchema,
  width: z.number().positive().max(2000),
  height: z.number().positive().max(2000),
});

const DiagramEdgeSchema = z.object({
  id: z.string().max(64),
  source: z.string(),
  target: z.string(),
  label: z.string().max(100).optional(),
  type: z.enum(['default', 'smoothstep', 'step']).default('smoothstep'),
});

const DiagramJsonSchema = z.object({
  version: z.literal(1),
  nodes: z.array(DiagramNodeSchema).max(200, 'Too many nodes (max 200)'),
  edges: z.array(DiagramEdgeSchema).max(300, 'Too many edges (max 300)'),
  viewport: z.object({
    x: z.number(),
    y: z.number(),
    zoom: z.number().min(0.1).max(4),
  }),
});

const PutBodySchema = z.object({
  diagramJson: DiagramJsonSchema,
  expectedVersion: z.number().int().min(0).optional(),
});

/**
 * Check if user can edit the given document.
 * admin/editor: any doc. uploader: own doc. viewer: none.
 */
async function canEditDiagram(session: any, docId: string): Promise<{ allowed: boolean; doc: any | null }> {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { id: true, uploaderId: true },
  });
  if (!doc) return { allowed: false, doc: null };
  if (!session?.user) return { allowed: false, doc };
  const role = session.user.role;
  const isPrivileged = role === 'admin' || role === 'editor';
  const isOwner = doc.uploaderId === session.user.id;
  return { allowed: isPrivileged || isOwner, doc };
}

/**
 * GET /api/documents/[id]/diagram
 * Returns the saved diagram, or 404 if none exists yet.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const diagram = await prisma.documentDiagram.findUnique({
    where: { documentId: id },
    include: {
      updatedBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!diagram) {
    return NextResponse.json(
      { error: 'Diagram not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    diagramJson: diagram.diagramJson,
    diagramVersion: diagram.diagramVersion,
    updatedAt: diagram.updatedAt,
    updatedBy: diagram.updatedBy,
  });
}

/**
 * PUT /api/documents/[id]/diagram
 * Save (create or replace) the diagram for this document.
 * Body: { diagramJson, expectedVersion? }
 * Optimistic locking: if expectedVersion provided and mismatches, return 409.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { allowed } = await canEditDiagram(session, id);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Forbidden: bạn không có quyền chỉnh sửa tài liệu này' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid diagram data', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { diagramJson, expectedVersion } = parsed.data;

  // Optimistic locking check
  const existing = await prisma.documentDiagram.findUnique({
    where: { documentId: id },
    select: { diagramVersion: true },
  });

  if (
    existing &&
    typeof expectedVersion === 'number' &&
    existing.diagramVersion !== expectedVersion
  ) {
    return NextResponse.json(
      {
        error: 'Conflict: diagram đã được cập nhật bởi người khác',
        code: 'VERSION_CONFLICT',
        currentVersion: existing.diagramVersion,
      },
      { status: 409 }
    );
  }

  // Upsert (insert or update). Increment version.
  const result = await prisma.documentDiagram.upsert({
    where: { documentId: id },
    create: {
      documentId: id,
      diagramJson,
      diagramVersion: 1,
      updatedById: session.user.id,
    },
    update: {
      diagramJson,
      diagramVersion: { increment: 1 },
      updatedById: session.user.id,
    },
    select: {
      diagramVersion: true,
      updatedAt: true,
    },
  });

  // Log activity (best-effort)
  try {
    await logActivity({
      userId: session.user.id,
      action: 'EDIT',
      entityType: 'document',
      entityId: id,
      metadata: {
        type: 'DIAGRAM_SAVE',
        version: result.diagramVersion,
        nodeCount: diagramJson.nodes.length,
        edgeCount: diagramJson.edges.length,
      },
    });
  } catch (e) {
    console.error('logActivity failed:', e);
  }

  return NextResponse.json({
    diagramVersion: result.diagramVersion,
    updatedAt: result.updatedAt,
  });
}
