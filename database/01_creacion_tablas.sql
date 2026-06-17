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