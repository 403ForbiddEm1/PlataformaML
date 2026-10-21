-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'CANDIDATO');

-- CreateEnum
CREATE TYPE "NivelEducativo" AS ENUM ('BACHILLERATO', 'TECNICO', 'LICENCIATURA', 'POSTGRADO', 'MAESTRIA', 'DOCTORADO');

-- CreateEnum
CREATE TYPE "EstadoVacante" AS ENUM ('BORRADOR', 'ABIERTA', 'PAUSADA', 'CERRADA');

-- CreateEnum
CREATE TYPE "EstadoPostulacion" AS ENUM ('RECIBIDA', 'EN_REVISION', 'PRESELECCIONADA', 'ENTREVISTA', 'RECHAZADA', 'CONTRATADA');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('CORREO', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('PENDIENTE', 'PROCESANDO', 'ENVIADA', 'FALLIDA');

-- CreateTable
CREATE TABLE "empresas" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "dominio" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "correo" TEXT NOT NULL,
    "claveHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "telefono" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'CANDIDATO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAccesoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,
    "empresaId" UUID,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfiles_candidato" (
    "id" UUID NOT NULL,
    "usuarioId" UUID NOT NULL,
    "urlCurriculo" TEXT,
    "textoExtraido" TEXT,
    "aniosExperiencia" INTEGER NOT NULL DEFAULT 0,
    "nivelEducativo" "NivelEducativo",
    "habilidades" TEXT[],
    "idiomas" TEXT[],
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perfiles_candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacantes" (
    "id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "ubicacion" TEXT,
    "rangoSalarial" TEXT,
    "requisitos" TEXT NOT NULL,
    "habilidadesRequeridas" TEXT[],
    "aniosExperienciaMinimos" INTEGER NOT NULL DEFAULT 0,
    "nivelEducativoMinimo" "NivelEducativo",
    "estado" "EstadoVacante" NOT NULL DEFAULT 'BORRADOR',
    "publicadaEn" TIMESTAMP(3),
    "cierraEn" TIMESTAMP(3),
    "empresaId" UUID NOT NULL,
    "creadaPorId" UUID NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vacantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postulaciones" (
    "id" UUID NOT NULL,
    "empresaId" UUID NOT NULL,
    "vacanteId" UUID NOT NULL,
    "candidatoId" UUID NOT NULL,
    "estado" "EstadoPostulacion" NOT NULL DEFAULT 'RECIBIDA',
    "postuladaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "postulaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_estado_postulacion" (
    "id" UUID NOT NULL,
    "postulacionId" UUID NOT NULL,
    "estadoAnterior" "EstadoPostulacion",
    "estadoNuevo" "EstadoPostulacion" NOT NULL,
    "nota" TEXT,
    "cambiadoPorId" UUID,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_estado_postulacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predicciones_ml" (
    "id" UUID NOT NULL,
    "postulacionId" UUID NOT NULL,
    "puntajeAfinidad" DOUBLE PRECISION NOT NULL,
    "esApto" BOOLEAN NOT NULL,
    "versionModelo" TEXT NOT NULL,
    "datosEntrada" JSONB,
    "datosCrudosPrediccion" JSONB,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predicciones_ml_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" UUID NOT NULL,
    "empresaId" UUID,
    "usuarioId" UUID NOT NULL,
    "postulacionId" UUID,
    "canal" "CanalNotificacion" NOT NULL,
    "tipo" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "asunto" TEXT,
    "mensaje" TEXT NOT NULL,
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "maxIntentos" INTEGER NOT NULL DEFAULT 3,
    "proximoIntentoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloqueadaEn" TIMESTAMP(3),
    "enviadaEn" TIMESTAMP(3),
    "registroError" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_nombre_key" ON "empresas"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_dominio_key" ON "empresas"("dominio");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE INDEX "usuarios_empresaId_rol_idx" ON "usuarios"("empresaId", "rol");

-- CreateIndex
CREATE UNIQUE INDEX "perfiles_candidato_usuarioId_key" ON "perfiles_candidato"("usuarioId");

-- CreateIndex
CREATE INDEX "perfiles_candidato_habilidades_idx" ON "perfiles_candidato" USING GIN ("habilidades");

-- CreateIndex
CREATE INDEX "vacantes_empresaId_estado_idx" ON "vacantes"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "vacantes_empresaId_creadoEn_idx" ON "vacantes"("empresaId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "vacantes_id_empresaId_key" ON "vacantes"("id", "empresaId");

-- CreateIndex
CREATE INDEX "postulaciones_empresaId_estado_idx" ON "postulaciones"("empresaId", "estado");

-- CreateIndex
CREATE INDEX "postulaciones_vacanteId_estado_idx" ON "postulaciones"("vacanteId", "estado");

-- CreateIndex
CREATE INDEX "postulaciones_candidatoId_idx" ON "postulaciones"("candidatoId");

-- CreateIndex
CREATE UNIQUE INDEX "postulaciones_vacanteId_candidatoId_key" ON "postulaciones"("vacanteId", "candidatoId");

-- CreateIndex
CREATE INDEX "historial_estado_postulacion_postulacionId_creadoEn_idx" ON "historial_estado_postulacion"("postulacionId", "creadoEn");

-- CreateIndex
CREATE UNIQUE INDEX "predicciones_ml_postulacionId_key" ON "predicciones_ml"("postulacionId");

-- CreateIndex
CREATE INDEX "predicciones_ml_versionModelo_idx" ON "predicciones_ml"("versionModelo");

-- CreateIndex
CREATE INDEX "notificaciones_estado_proximoIntentoEn_idx" ON "notificaciones"("estado", "proximoIntentoEn");

-- CreateIndex
CREATE INDEX "notificaciones_empresaId_creadoEn_idx" ON "notificaciones"("empresaId", "creadoEn");

-- CreateIndex
CREATE INDEX "notificaciones_usuarioId_idx" ON "notificaciones"("usuarioId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "perfiles_candidato" ADD CONSTRAINT "perfiles_candidato_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacantes" ADD CONSTRAINT "vacantes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vacantes" ADD CONSTRAINT "vacantes_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_vacanteId_empresaId_fkey" FOREIGN KEY ("vacanteId", "empresaId") REFERENCES "vacantes"("id", "empresaId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "postulaciones" ADD CONSTRAINT "postulaciones_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_postulacion" ADD CONSTRAINT "historial_estado_postulacion_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "postulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_estado_postulacion" ADD CONSTRAINT "historial_estado_postulacion_cambiadoPorId_fkey" FOREIGN KEY ("cambiadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predicciones_ml" ADD CONSTRAINT "predicciones_ml_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "postulaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_postulacionId_fkey" FOREIGN KEY ("postulacionId") REFERENCES "postulaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
