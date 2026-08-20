-- Migración: columna recordatorio_enviado para control de envíos WhatsApp
USE EmmE_Beauty;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Turno') AND name = 'recordatorio_enviado'
)
BEGIN
    ALTER TABLE Turno ADD recordatorio_enviado BIT NOT NULL DEFAULT 0;
END
GO
