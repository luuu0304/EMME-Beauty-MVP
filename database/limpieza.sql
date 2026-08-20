-- =======================================================================
-- 1. LIMPIEZA PROFUNDA TOTAAL
-- =======================================================================
DELETE FROM Ingreso;               
DELETE FROM Gasto;                 
DELETE FROM Turno_Extra;
DELETE FROM Turno;                 
DELETE FROM Liquidacion_Sueldo;    
DELETE FROM Empleada_Area;
DELETE FROM Clienta;
DELETE FROM Empleada;
DELETE FROM Servicio;

-- =======================================================================
-- 2. RESETEO DE IDs (Todo arranca desde 1)
-- =======================================================================
DBCC CHECKIDENT ('Ingreso', RESEED, 0);
DBCC CHECKIDENT ('Gasto', RESEED, 0);
DBCC CHECKIDENT ('Turno', RESEED, 0);
DBCC CHECKIDENT ('Clienta', RESEED, 0);
DBCC CHECKIDENT ('Empleada', RESEED, 0);
DBCC CHECKIDENT ('Servicio', RESEED, 0);

-- =======================================================================
-- 3. CARGA DE STAFF (Con DNIs de prueba para evitar el error)
-- =======================================================================
INSERT INTO Empleada (Nombre_Ap, DNI) VALUES
('Luciana', '11111111'),
('Agustina', '22222222'),
('Sandra', '33333333'),
('Vani', '44444444'),
('Anto', '55555555'),
('Leyla', '66666666'),
('Sil', '77777777'),
('María Pia', '88888888');

-- =======================================================================
-- 4. CARGA DE CLIENTAS FRECUENTES
-- =======================================================================
INSERT INTO Clienta (Nombre, Apellido, Telefono, Fecha_Nac) VALUES
('Monica', 'Cohen', '3874761251', '2026-05-04'),
('Lulu', 'Cabrera', '3816073357', NULL),
('Sofia', 'Causarano', NULL, NULL),
('Miriam', 'Chacon', '3873524164', '2026-07-28'),
('Maria del Mar', 'Cabrera', '3875807377', '2026-05-22'),
('Sofi', 'Cespedes', '3875068176', NULL),
('Tefi', 'Castillo', '3876296914', '2026-06-06'),
('Anto', 'Cartaman', '387', '2026-05-05'),
('Clau', 'Cansinos', '387401838', '2026-06-08'),
('Carla', 'Cuellar', '3877546676', '2026-10-27'),
('Fernanda ', 'Correa', '3874560501', '2026-02-02'),
('Guadalupe', 'Carrizo', '387', '2026-04-17'),
('Angelina', 'Castillo', '3874063431', '2026-01-27'),
('Agustina', 'Casanova', '3875129666', NULL),
('Camila', 'Cajade', '2215987424', '2026-09-22'),
('Lupe', 'Carrizo', '3875200025', '2026-06-25'),
('Marta', 'D aluisi', NULL, NULL),
('Karina', 'De los Angeles', '3874563081', '2026-01-17'),
('Sol', 'Ferrari', NULL, NULL),
('Bernarda', 'Fuentes', NULL, NULL),
('Canela', 'Falco', NULL, '2026-02-09'),
('Yami', 'Felipe', '3815126798', '2026-06-22'),
('Noemi', 'Filomarino', '3876100920', '2026-11-18'),
('Josefina', 'Feres', NULL, '2026-09-02'),
('Mariana', 'Huertas', '3885234571', '2026-12-26');

-- =======================================================================
-- 5. CARGA DE SERVICIOS
-- =======================================================================
INSERT INTO Servicio (Nombre, Area, Precio_Base, Duracion_Minutos) VALUES
('Semi Permanente Manos', 'Manicura', 23000, 90),
('Kapping Base', 'Manicura', 25000, 90),
('Kapping Gel', 'Manicura', 27000, 90),
('Soft', 'Manicura', 30000, 90),
('Esculpidas', 'Manicura', 32000, 90),
('Esmaltado Tradicional Manos', 'Manicura', 20000, 90),
('Belleza de Manos', 'Manicura', 18000, 90),
('Belleza de Pies', 'Pedicura', 19000, 90),
('Esmaltado Tradicional Pies', 'Pedicura', 21000, 90),
('Semi Permanente Pies', 'Pedicura', 26000, 90),
('Podoestética sin Esmaltado', 'Pedicura', 5000, 90),
('Podo estética con Tradicional', 'Pedicura', 31000, 90),
('Podo estética con Semi', 'Pedicura', 36000, 90),
('Spa Jelly', 'Pedicura', 5000, 90),
('Lifting + Nutri', 'Cejas y Pestañas', 28000, 90),
('Lifting + Nutri + Tinte', 'Cejas y Pestañas', 31000, 90),
('Perfilado de cejas', 'Cejas y Pestañas', 20000, 90),
('Laminado de cejas', 'Cejas y Pestañas', 23000, 90),
('Pestañas pelo por pelo', 'Cejas y Pestañas', 28000, 90);