-- 1. Creamos la base de datos
CREATE DATABASE EmmE_Beauty;
GO

USE EmmE_Beauty;
GO

-- 2. Creamos la tabla Clienta
CREATE TABLE Clienta (
    Id_Clienta INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL,
    Apellido VARCHAR(50) NOT NULL,
    Fecha_Nac DATE,
    Telefono VARCHAR(20),
    Ig VARCHAR(50) -- Opcional, por eso no lleva NOT NULL
);
GO

-- 3. Creamos la tabla Empleada
CREATE TABLE Empleada (
    Id_Empleada INT IDENTITY(1,1) PRIMARY KEY,
    DNI VARCHAR(15) UNIQUE NOT NULL,
    Nombre_Ap VARCHAR(100) NOT NULL,
    Telefono VARCHAR(20)
);
GO

-- 4. Creamos la tabla Servicio
CREATE TABLE Servicio (
    Id_Servicio INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Precio_Base DECIMAL(10,2) NOT NULL,
    Duracion_Minutos INT NOT NULL -- Clave para calcular los tiempos en la agenda
);
GO

-- 5. Creamos la tabla Turno (El corazón del sistema)
CREATE TABLE Turno (
    Id_Turno INT IDENTITY(1,1) PRIMARY KEY,
    Id_Clienta INT NOT NULL,
    Id_Empleada INT NOT NULL,
    Id_Servicio INT NOT NULL,
    Fecha_Hora DATETIME NOT NULL, -- Incluye día y hora del turno
    
    -- Manejo de la famosa seña
    Sena_Monto DECIMAL(10,2) DEFAULT 0,
    Id_Empleada_Recibio_Sena INT NULL, -- Quién tiene la plata de la seña (Mili o Meli)
    
    -- Estado del turno (Pendiente, Realizado, Cancelado)
    Estado VARCHAR(20) DEFAULT 'Pendiente', 
    
    -- Relaciones (Foreign Keys)
    CONSTRAINT FK_Turno_Clienta FOREIGN KEY (Id_Clienta) REFERENCES Clienta(Id_Clienta),
    CONSTRAINT FK_Turno_Empleada FOREIGN KEY (Id_Empleada) REFERENCES Empleada(Id_Empleada),
    CONSTRAINT FK_Turno_Servicio FOREIGN KEY (Id_Servicio) REFERENCES Servicio(Id_Servicio),
    CONSTRAINT FK_Turno_RecibioSena FOREIGN KEY (Id_Empleada_Recibio_Sena) REFERENCES Empleada(Id_Empleada)
);
GO
ALTER TABLE Turno ADD Color VARCHAR(100) NULL;

-- 6. Creamos la Tabla Categoria_Gasto
CREATE TABLE Categoria_Gasto (
    Id_Categoria INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL
);
GO

-- 7. Creamos la Tabla Gasto
CREATE TABLE Gasto (
    Id_Gasto INT IDENTITY(1,1) PRIMARY KEY,
    Fecha DATE NOT NULL,
    Descripcion VARCHAR(255) NOT NULL,
    Monto DECIMAL(12, 2) NOT NULL,
    Id_Categoria INT,
    
    -- Relacionamos el gasto con su categoría
    CONSTRAINT FK_Gasto_Categoria FOREIGN KEY (Id_Categoria) 
    REFERENCES Categoria_Gasto(Id_Categoria)
);
GO

-- INSERCIÓN DE LAS CATEGORÍAS INICIALES
-- Le dejamos estas 5 opciones listas para usar en el desplegable
INSERT INTO Categoria_Gasto (Nombre) 
VALUES 
    ('Insumos del Local'),
    ('Limpieza y Mantenimiento'),
    ('Servicios Fijos'),
    ('Marketing y Publicidad'),
    ('Varios / Otros');
GO

-- 8. Creacion Tabla Extra
CREATE TABLE Extra (
    Id_Extra INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Precio DECIMAL(12, 2) NOT NULL
);
GO

-- 9. Creacion Tabla Turno_Extra
CREATE TABLE Turno_Extra (
    Id_Turno_Extra INT IDENTITY(1,1) PRIMARY KEY,
    Id_Turno INT NOT NULL, 
    Id_Extra INT NOT NULL,
    
    CONSTRAINT FK_TurnoExtra_Turno FOREIGN KEY (Id_Turno) REFERENCES Turno(Id_Turno),
    CONSTRAINT FK_TurnoExtra_Extra FOREIGN KEY (Id_Extra) REFERENCES Extra(Id_Extra)
);
GO

--10. Creacion Tabla Ingresos
CREATE TABLE Ingreso (
    Id_Ingreso INT IDENTITY(1,1) PRIMARY KEY,
    Id_Turno INT NOT NULL,
    Fecha DATE NOT NULL,
    Monto_Total DECIMAL(12, 2) NOT NULL,
    Medio_Pago VARCHAR(50) NOT NULL, -- 'Efectivo', 'Transferencia'
    Descuento_Aplicado DECIMAL(12, 2) DEFAULT 0,
    
    CONSTRAINT FK_Ingreso_Turno FOREIGN KEY (Id_Turno) REFERENCES Turno(Id_Turno)
);
GO

--INSERCIÓN DE LOS EXTRAS INICIALES
INSERT INTO Extra (Nombre, Precio) 
VALUES 
    ('Francesitas', 2000.00),
    ('Cat Eye / Polvos', 2000.00),
    ('Full Diseño', 3000.00),
    ('Retiro de otro salón (Simple)', 3000.00),
    ('Retiro de otro salón (Completo)', 5000.00),
    ('Spa Jelly', 5000.00);

-- 1. Hacemos que el Id_Turno sea opcional (porque un ingreso manual no lo tiene)
ALTER TABLE Ingreso ALTER COLUMN Id_Turno INT NULL;

-- 2. Agregamos una columna para anotar el detalle (Ej: "Gift Card", "Aceite para cutículas")
ALTER TABLE Ingreso ADD Concepto VARCHAR(150) NULL;

-- 1. Agregamos la columna 'Area' a la tabla Servicio (Si no existe)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE Name = N'Area' AND Object_ID = OBJECT_ID(N'Servicio')
)
BEGIN
    ALTER TABLE Servicio ADD Area VARCHAR(100) NULL;
END
GO

-- 2. Creamos la tabla intermedia Empleada_Area para las especialidades
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'Empleada_Area') AND type in (N'U'))
BEGIN
    CREATE TABLE Empleada_Area (
        Id_Empleada INT NOT NULL,
        Area VARCHAR(100) NOT NULL,
        CONSTRAINT FK_EmpArea_Empleada FOREIGN KEY (Id_Empleada) REFERENCES Empleada(Id_Empleada)
    );
END
GO

-- Ejemplo rápido para actualizar los servicios que ya tenías:
UPDATE Servicio SET Area = 'Manicura' WHERE Nombre LIKE '%Kapping%' OR Nombre LIKE '%Manicura%';
UPDATE Servicio SET Area = 'Cejas y Pestañas' WHERE Nombre LIKE '%Lifting%';

SELECT * FROM Clienta;