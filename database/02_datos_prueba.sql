USE EmmE_Beauty;
GO

-- 1. Insertamos a las empleadas / socias
INSERT INTO Empleada (DNI, Nombre_Ap, Telefono)
VALUES 
('30111222', 'Mili', '3874111111'),
('31222333', 'Meli', '3874222222');
GO

-- 2. Insertamos Servicios de prueba
INSERT INTO Servicio (Nombre, Precio_Base, Duracion_Minutos)
VALUES 
('Kapping Gel', 12000.00, 90),
('Service Kapping', 10000.00, 75),
('Manicura Semipermanente', 8000.00, 60),
('Lifting de Pestañas', 9500.00, 60);
GO

-- 3. Insertamos algunas Clientas
INSERT INTO Clienta (Nombre, Apellido, Fecha_Nac, Telefono, Ig)
VALUES 
('Ana', 'Perez', '1995-04-12', '3875123456', '@ana.perez'),
('Sofia', 'Gomez', '1998-11-05', '3875987654', '@sofi_g'),
('Valentina', 'Ruiz', '2001-02-20', '3875554433', NULL);
GO

-- 4. Insertamos Turnos para probar la agenda y las señas
-- Notas de los IDs generados: 
-- Empleadas: 1 (Mili), 2 (Meli)
-- Servicios: 1 (Kapping), 2 (Service), 3 (Semi), 4 (Lifting)
-- Clientas: 1 (Ana), 2 (Sofia), 3 (Valentina)

INSERT INTO Turno (Id_Clienta, Id_Empleada, Id_Servicio, Fecha_Hora, Sena_Monto, Id_Empleada_Recibio_Sena, Estado)
VALUES 
-- Turno a futuro con seña (Ana se hace Kapping con Mili, le dejó seña a Mili)
(1, 1, 1, '2026-06-20 10:00:00', 3000.00, 1, 'Pendiente'), 

-- Turno a futuro sin seña (Sofia se hace Lifting con Meli)
(2, 2, 4, '2026-06-20 11:30:00', 0.00, NULL, 'Pendiente'),   

-- Turno ya realizado (Valentina se hizo Semi con Mili, pero la seña se la había dado a Meli)
(3, 1, 3, '2026-06-16 15:00:00', 2000.00, 2, 'Realizado'), 

-- Turno programado para el mes que viene (Ana vuelve para el service con Meli)
(1, 2, 2, '2026-07-15 10:00:00', 0.00, NULL, 'Pendiente');  
GO

SELECT * FROM Empleada;
SELECT * FROM Servicio;
SELECT * FROM Clienta;
SELECT * FROM Turno;

USE EmmE_Beauty;
ALTER TABLE Turno ADD Fecha_Hora_Fin DATETIME;

USE EmmE_Beauty;

-- Le sumamos 90 minutos a la Fecha_Hora de inicio para calcular el Fin
UPDATE Turno 
SET Fecha_Hora_Fin = DATEADD(minute, 90, Fecha_Hora)
WHERE Fecha_Hora_Fin IS NULL;

-- Lo vemos para confirmar

SELECT * FROM Turno;