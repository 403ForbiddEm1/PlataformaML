-- AlterTable
ALTER TABLE "predicciones_ml" ADD COLUMN     "modeloId" UUID;

-- CreateTable
CREATE TABLE "modelos_ml" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "algoritmo" TEXT NOT NULL,
    "metricas" JSONB,
    "parametros" JSONB,
    "totalEntrenamiento" INTEGER,
    "entrenadoEn" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "modelos_ml_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_auditoria" (
    "id" UUID NOT NULL,
    "empresaId" UUID,
    "usuarioId" UUID,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" UUID,
    "detalle" JSONB,
    "ip" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "modelos_ml_activo_idx" ON "modelos_ml"("activo");

-- CreateIndex
CREATE UNIQUE INDEX "modelos_ml_nombre_version_key" ON "modelos_ml"("nombre", "version");

-- CreateIndex
CREATE INDEX "registro_auditoria_empresaId_creadoEn_idx" ON "registro_auditoria"("empresaId", "creadoEn");

-- CreateIndex
CREATE INDEX "registro_auditoria_usuarioId_creadoEn_idx" ON "registro_auditoria"("usuarioId", "creadoEn");

-- CreateIndex
CREATE INDEX "registro_auditoria_entidad_entidadId_idx" ON "registro_auditoria"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "predicciones_ml_modeloId_idx" ON "predicciones_ml"("modeloId");

-- AddForeignKey
ALTER TABLE "predicciones_ml" ADD CONSTRAINT "predicciones_ml_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "modelos_ml"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_auditoria" ADD CONSTRAINT "registro_auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
