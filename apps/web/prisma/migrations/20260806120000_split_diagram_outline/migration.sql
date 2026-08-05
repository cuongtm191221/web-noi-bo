-- Plan 16: Split DocumentFlowchart into DocumentDiagram + DocumentOutline
-- AI flowchart generation is removed. Manual editor uses document_diagrams.
-- Outline data moves to document_outlines.

-- Create table document_outlines (new)
CREATE TABLE "document_outlines" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "outline_json" JSONB NOT NULL,
    "model_used" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_outlines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_outlines_document_id_key" ON "document_outlines"("document_id");

ALTER TABLE "document_outlines" ADD CONSTRAINT "document_outlines_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create table document_diagrams (replaces document_flowcharts)
CREATE TABLE "document_diagrams" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "diagram_json" JSONB NOT NULL,
    "diagram_version" INTEGER NOT NULL DEFAULT 0,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_diagrams_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "document_diagrams_document_id_key" ON "document_diagrams"("document_id");

ALTER TABLE "document_diagrams" ADD CONSTRAINT "document_diagrams_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "document_diagrams" ADD CONSTRAINT "document_diagrams_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old document_flowcharts table (data is acceptable to lose per user)
DROP TABLE IF EXISTS "document_flowcharts";
