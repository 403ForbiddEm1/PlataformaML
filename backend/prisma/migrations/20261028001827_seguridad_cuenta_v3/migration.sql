/*
  Warnings:

  - You are about to drop the column `activa` on the `empresas` table. All the data in the column will be lost.
  - You are about to drop the column `urlCurriculo` on the `perfiles_candidato` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[identificacionFiscal]` on the table `empresas` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[numero]` on the table `postulaciones` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleId]` on the table `usuarios` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "EstadoEmpresa" AS ENUM ('PENDIENTE_APROBACION', 'ACTIVA', 'SUSPENDIDA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "ModalidadTrabajo" AS ENUM ('PRESENCIAL', 'REMOTO', 'HIBRIDO');

-- CreateEnum
CREATE TYPE "TipoContrato" AS ENUM ('TIEMPO_COMPLETO', 'MEDIO_TIEMPO', 'PASANTIA');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CURRICULO', 'CEDULA');

-- CreateEnum
CREATE TYPE "TipoToken" AS ENUM ('RECUPERACION_CLAVE', 'VERIFICACION_CORREO');

-- AlterEnum
ALTER TYPE "Rol" ADD VALUE 'RRHH';

-- AlterTable
ALTER TABLE "empresas" DROP COLUMN "activa",
ADD COLUMN     "aprobadaEn" TIMESTAMP(3),
ADD COLUMN     "aprobadaPorId" UUID,
ADD COLUMN     "correoContacto" TEXT,
ADD COLUMN     "estado" "EstadoEmpresa" NOT NULL DEFAULT 'PENDIENTE_APROBACION',
ADD COLUMN     "identificacionFiscal" TEXT,
ADD COLUMN     "motivoRechazo" TEXT,
ADD COLUMN     "razonSocial" TEXT,
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "sitioWeb" TEXT,
ADD COLUMN     "telefonoContacto" TEXT;

-- AlterTable
ALTER TABLE "perfiles_candidato" DROP COLUMN "urlCurriculo",
ADD COLUMN     "biografia" TEXT,
ADD COLUMN     "titulo" TEXT,
ADD COLUMN     "ubicacion" TEXT;

-- AlterTable
ALTER TABLE "postulaciones" ADD COLUMN     "cedulaId" UUID,
ADD COLUMN     "curriculoId" UUID,
ADD COLUMN     "numero" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "aceptoTerminosEn" TIMESTAMP(3),
ADD COLUMN     "bloqueadoHasta" TIMESTAMP(3),
ADD COLUMN     "correoVerificadoEn" TIMESTAMP(3),
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "claveHash" DROP NOT NULL;

-- AlterTable
ALTER TABLE "vacantes" ADD COLUMN     "cantidadVacantes" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "departamento" TEXT NOT NULL DEFAULT 'General',
ADD COLUMN     "modalidad" "ModalidadTrabajo" NOT NULL DEFAULT 'HIBRIDO',
ADD COLUMN     "tipoContrato" "TipoContrato" NOT NULL DEFAULT 'TIEMPO_COMPLETO';

-- CreateTable
CREATE TABLE "linea_base_proceso" (
    "id" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "tiempoFiltradoManualDias" DOUBLE PRECISION NOT NULL,
    "precisionFiltradoManual" DOUBLE PRECISION NOT NULL,
    "satisfaccionReclutadores" DOUBLE PRECISION,
    "medidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linea_base_proceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitaciones" (
    "id" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "correo" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadaEn" TIMESTAMP(3),
    "invitadoPorId" UUID,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens_usuario" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "tipo" "TipoToken" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educacion_candidato" (
    "id" UUID NOT NULL,
    "perfilId" UUID NOT NULL,
    "institucion" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "anioGraduacion" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "educacion_candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiencia_candidato" (
    "id" UUID NOT NULL,
    "perfilId" UUID NOT NULL,
    "empresa" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "anioInicio" INTEGER NOT NULL,
    "anioFin" INTEGER,
    "descripcion" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiencia_candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos_candidato" (
    "id" UUID NOT NULL,
    "perfilId" UUID NOT NULL,
    "tipo" "TipoDocumento" NOT NULL,
    "nombreArchivo" TEXT NOT NULL,
    "rutaAlmacenamiento" TEXT NOT NULL,
    "tipoMime" TEXT NOT NULL,
    "tamanioBytes" INTEGER NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conjuntos_datos" (
    "id" UUID NOT NULL,
    "empresaId" UUID,
    "subidoPorId" UUID,
    "nombreArchivo" TEXT NOT NULL,
    "rutaAlmacenamiento" TEXT NOT NULL,
    "totalRegistros" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conjuntos_datos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "linea_base_proceso_empresaId_key" ON "linea_base_proceso"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "invitaciones_tokenHash_key" ON "invitaciones"("tokenHash");

-- CreateIndex
CREATE INDEX "invitaciones_empresaId_correo_idx" ON "invitaciones"("empresaId", "correo");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_usuario_tokenHash_key" ON "tokens_usuario"("tokenHash");

-- CreateIndex
CREATE INDEX "tokens_usuario_usuarioId_tipo_idx" ON "tokens_usuario"("usuarioId", "tipo");

-- CreateIndex
CREATE INDEX "educacion_candidato_perfilId_idx" ON "educacion_candidato"("perfilId");

-- CreateIndex
CREATE INDEX "experiencia_candidato_perfilId_idx" ON "experiencia_candidato"("perfilId");

-- CreateIndex
CREATE INDEX "documentos_candidato_perfilId_tipo_vigente_idx" ON "documentos_candidato"("perfilId", "tipo", "vigente");

-- CreateIndex
CREATE INDEX "conjuntos_datos_empresaId_creadoEn_idx" ON "conjuntos_datos"("empresaId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_identificacionFiscal_key" ON "empresas"("identificacionFiscal");

-- CreateIndex
CREATE INDEX "empresas_estado_idx" ON "empresas"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "postulaciones_numero_key" ON "postulaciones"("numero");

-- CreateIndex
CREATE INDEX "registro_auditoria_accion_creadoEn_idx" ON "registro_auditoria"("accion", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_googleId_key" ON "usuarios"("googleId");

-- AddForeignKey
ALTER TABLE "empresas" ADD CONSTRAINT "empresas_aprobadaPorId_fkey" FOREIGN KEY ("aprobadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linea_base_proceso" ADD CONSTRAINT "linea_base_proceso_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitaciones" ADD CONSTRAINT "invitaciones_invitadoPorId_fkey" FOREIGN KEY ("invitadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokens_usuario" ADD CONSTRAINT "tokens_usuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educacion_candidato" ADD CONSTRAINT "educacion_candidato_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfiles_candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiencia_candidato" ADD CONSTRAINT "experiencia_candidato_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfiles_candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos_candidato" ADD CONSTRAINT "documentos_candidato_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "perfiles_candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_curriculoId_fkey" FOREIGN KEY ("curriculoId") REFERENCES "documentos_candidato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_cedulaId_fkey" FOREIGN KEY ("cedulaId") REFERENCES "documentos_candidato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conjuntos_datos" ADD CONSTRAINT "conjuntos_datos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conjuntos_datos" ADD CONSTRAINT "conjuntos_datos_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
