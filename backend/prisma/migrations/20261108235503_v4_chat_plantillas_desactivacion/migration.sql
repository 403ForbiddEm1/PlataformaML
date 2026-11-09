-- CreateEnum
CREATE TYPE "MotivoDesactivacion" AS ENUM ('INACTIVIDAD', 'VENCIMIENTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "EventoNotificacion" AS ENUM ('POSTULACION_RECIBIDA', 'EN_REVISION', 'PRESELECCIONADA', 'ENTREVISTA_1', 'ENTREVISTA_2', 'CONTRATADA', 'RECHAZADA', 'MENSAJE_NUEVO');

-- CreateEnum
CREATE TYPE "EstadoAprobacionPlantilla" AS ENUM ('NO_APLICA', 'PENDIENTE', 'APROBADA', 'RECHAZADA');

-- AlterEnum
ALTER TYPE "CanalNotificacion" ADD VALUE 'APP';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoNotificacion" ADD VALUE 'ENTREGADA';
ALTER TYPE "EstadoNotificacion" ADD VALUE 'LEIDA';

-- AlterTable
ALTER TABLE "empresas" ADD COLUMN     "activaHasta" TIMESTAMP(3),
ADD COLUMN     "desactivadaEn" TIMESTAMP(3),
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "latitud" DOUBLE PRECISION,
ADD COLUMN     "longitud" DOUBLE PRECISION,
ADD COLUMN     "motivoDesactivacion" "MotivoDesactivacion",
ADD COLUMN     "ultimaVacanteEn" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "notificaciones" ADD COLUMN     "idExterno" TEXT;

-- AlterTable
ALTER TABLE "perfiles_candidato" ADD COLUMN     "cedulaNumero" TEXT,
ADD COLUMN     "perfilVisible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "postulaciones" ADD COLUMN     "respuestasAdicionales" JSONB;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "claveCambiadaEn" TIMESTAMP(3),
ADD COLUMN     "consentimientoWhatsappEn" TIMESTAMP(3),
ADD COLUMN     "fotoRuta" TEXT;

-- AlterTable
ALTER TABLE "vacantes" ADD COLUMN     "camposAdicionales" JSONB,
ADD COLUMN     "especializacion" TEXT,
ADD COLUMN     "latitud" DOUBLE PRECISION,
ADD COLUMN     "longitud" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "plantillas_notificacion" (
    "id" UUID NOT NULL,
    "empresaId" UUID,
    "evento" "EventoNotificacion" NOT NULL,
    "canal" "CanalNotificacion" NOT NULL,
    "asunto" TEXT,
    "cuerpo" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "estadoAprobacion" "EstadoAprobacionPlantilla" NOT NULL DEFAULT 'NO_APLICA',
    "nombreExterno" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantillas_notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversaciones" (
    "id" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "candidatoId" UUID NOT NULL,
    "postulacionId" UUID,
    "ultimoMensajeEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" UUID NOT NULL,
    "conversacionId" UUID NOT NULL,
    "autorId" UUID NOT NULL,
    "contenido" TEXT NOT NULL,
    "leidoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plantillas_notificacion_evento_canal_activa_idx" ON "plantillas_notificacion"("evento", "canal", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "plantillas_notificacion_empresaId_evento_canal_version_key" ON "plantillas_notificacion"("empresaId", "evento", "canal", "version");

-- CreateIndex
CREATE UNIQUE INDEX "conversaciones_postulacionId_key" ON "conversaciones"("postulacionId");

-- CreateIndex
CREATE INDEX "conversaciones_empresaId_ultimoMensajeEn_idx" ON "conversaciones"("empresaId", "ultimoMensajeEn");

-- CreateIndex
CREATE INDEX "conversaciones_candidatoId_ultimoMensajeEn_idx" ON "conversaciones"("candidatoId", "ultimoMensajeEn");

-- CreateIndex
CREATE INDEX "mensajes_conversacionId_creadoEn_idx" ON "mensajes"("conversacionId", "creadoEn");

-- CreateIndex
CREATE INDEX "empresas_estado_ultimaVacanteEn_idx" ON "empresas"("estado", "ultimaVacanteEn");

-- CreateIndex
CREATE INDEX "empresas_estado_activaHasta_idx" ON "empresas"("estado", "activaHasta");

-- CreateIndex
CREATE INDEX "notificaciones_idExterno_idx" ON "notificaciones"("idExterno");

-- CreateIndex
CREATE INDEX "vacantes_estado_especializacion_idx" ON "vacantes"("estado", "especializacion");

-- AddForeignKey
ALTER TABLE "plantillas_notificacion" ADD CONSTRAINT "plantillas_notificacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversaciones" ADD CONSTRAINT "conversaciones_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "postulaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
