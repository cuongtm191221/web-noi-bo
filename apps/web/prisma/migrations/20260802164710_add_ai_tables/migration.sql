-- CreateTable
CREATE TABLE "document_summaries" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "executive_summary" TEXT NOT NULL,
    "checklist" JSONB NOT NULL,
    "model_used" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_flowcharts" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "mermaid_syntax" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_flowcharts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "page_number" INTEGER,
    "slide_number" INTEGER,
    "sheet_name" TEXT,
    "row_number" INTEGER,
    "token_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "citations" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "chunk_id" TEXT NOT NULL,
    "claim_text" TEXT NOT NULL,
    "page_number" INTEGER,
    "slide_number" INTEGER,
    "sheet_name" TEXT,
    "row_number" INTEGER,
    "column_letter" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_summaries_document_id_key" ON "document_summaries"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_flowcharts_document_id_key" ON "document_flowcharts"("document_id");

-- CreateIndex
CREATE INDEX "document_chunks_document_id_idx" ON "document_chunks"("document_id");

-- CreateIndex
CREATE INDEX "citations_document_id_idx" ON "citations"("document_id");

-- AddForeignKey
ALTER TABLE "document_summaries" ADD CONSTRAINT "document_summaries_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_flowcharts" ADD CONSTRAINT "document_flowcharts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
