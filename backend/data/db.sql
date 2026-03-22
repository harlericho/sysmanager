-- =======================================================
-- BASE DE DATOS DE SUSCRIPCIONES DE SOFTWARE
-- Compatible con PHP 7.4 + PDO + JWT
-- =======================================================
CREATE DATABASE IF NOT EXISTS db_sysmanager CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE db_sysmanager;
-- =====================================
-- TABLA: USUARIOS (ADMIN / EMPLEADO)
-- =====================================
CREATE TABLE tbl_usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombres VARCHAR(150) NOT NULL,
    usuario VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    rol ENUM('ADMIN','EMPLEADO') NOT NULL,
    estado CHAR(1) DEFAULT 'A'
);

-- =====================================
-- TABLA: CLIENTES
-- =====================================
CREATE TABLE tbl_cliente (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ruc VARCHAR(15),
    nombre_empresa VARCHAR(255) NOT NULL,
    usuario VARCHAR(100),
    email VARCHAR(255),
    telefono VARCHAR(20),
    estado CHAR(1) DEFAULT 'A'
);

-- =====================================
-- TABLA: PLANES (CATÁLOGO)
-- =====================================
CREATE TABLE tbl_plan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,              -- Ej: Nube Mensual, Local Anual
    tipo ENUM('NUBE','LOCAL') NOT NULL,
    duracion_base INT NOT NULL,                -- duración en meses (1, 6, 12)
    precio DECIMAL(10,2) DEFAULT 0.00,
    permite_renovacion BOOLEAN DEFAULT TRUE,
    estado CHAR(1) DEFAULT 'A'
);

-- =====================================
-- TABLA: SUSCRIPCIÓN (CONTRATO PRINCIPAL)
-- =====================================
CREATE TABLE tbl_suscripcion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_plan INT NOT NULL,
    precio_instalacion DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Costo unico del sistema (solo LOCAL)',
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    tipo_pago ENUM('MENSUAL','ANUAL','LICENCIA') NOT NULL,
    estado ENUM('ACTIVO','VENCIDO','CANCELADO') DEFAULT 'ACTIVO',
    creado_por INT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cliente 
        FOREIGN KEY (id_cliente) REFERENCES tbl_cliente(id),

    CONSTRAINT fk_plan 
        FOREIGN KEY (id_plan) REFERENCES tbl_plan(id),

    CONSTRAINT fk_usuario 
        FOREIGN KEY (creado_por) REFERENCES tbl_usuario(id)
);

-- =====================================
-- TABLA: RENOVACIONES (HISTORIAL)
-- =====================================
CREATE TABLE tbl_renovacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_suscripcion INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    meses INT NOT NULL,
    precio DECIMAL(10,2) DEFAULT 0.00,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_suscripcion 
        FOREIGN KEY (id_suscripcion) REFERENCES tbl_suscripcion(id)
);

-- =======================================================
-- DATOS DE PRUEBA
-- =======================================================

-- =====================================
-- USUARIOS
-- Contraseñas: admin2026*/ / empleado123
-- =====================================
INSERT INTO tbl_usuario (nombres, usuario, password, rol, estado) VALUES
('Administrador Principal', 'admin',    '$2y$10$20xvLv1F8lyxRu5hvpHokO7ueoP2DNq8HQaMaLA5Ul7XlnE0s1F0u', 'ADMIN',    'A'),
('Juan Pérez Empleado',     'empleado', '$2y$10$G8c3iDB.Ned8mW5Wj5tIP.EFqgeQBoJ73x2UxkmTuD8og7/CcD2uG', 'EMPLEADO', 'A');

-- =====================================
-- CLIENTES
-- =====================================
INSERT INTO tbl_cliente (ruc, nombre_empresa, usuario, email, telefono, estado) VALUES
('20123456789', 'Empresa Tech S.A.C.',     'techsac',    'contacto@techsac.com',    '01-234-5678', 'A'),
('20987654321', 'Soluciones Digital E.I.R.L.', 'soldig', 'info@soldig.pe',          '01-876-5432', 'A'),
('10456789012', 'Consultora Norte S.R.L.', 'conorte',    'ventas@conorte.com',      '044-123456',  'A');

-- =====================================
-- PLANES
-- =====================================
INSERT INTO tbl_plan (nombre, tipo, duracion_base, precio, permite_renovacion, estado) VALUES
('Nube Mensual',   'NUBE',  1,  50.00, TRUE, 'A'),
('Nube Semestral', 'NUBE',  6, 270.00, TRUE, 'A'),
('Nube Anual',     'NUBE', 12, 500.00, TRUE, 'A'),
('Local Anual',    'LOCAL',12, 800.00, TRUE, 'A'),
('Licencia Local', 'LOCAL',12,1500.00, FALSE,'A');

-- =====================================
-- SUSCRIPCIONES
-- =====================================
-- precio_instalacion = 0 para planes NUBE; para LOCAL poner el costo real de instalacion
INSERT INTO tbl_suscripcion (id_cliente, id_plan, precio_instalacion, fecha_inicio, fecha_fin, tipo_pago, estado, creado_por) VALUES
(1, 3,    0.00, '2026-01-01', '2027-01-01', 'ANUAL',    'ACTIVO',  1),
(2, 1,    0.00, '2026-03-01', '2026-04-01', 'MENSUAL',  'ACTIVO',  1),
(3, 4, 280.00, '2025-06-01', '2026-06-01', 'ANUAL',    'VENCIDO', 2);

-- =====================================
-- RENOVACIONES
-- =====================================
INSERT INTO tbl_renovacion (id_suscripcion, fecha_inicio, fecha_fin, meses, precio) VALUES
(3, '2025-06-01', '2026-06-01', 12, 800.00),
(3, '2026-06-01', '2027-06-01', 12, 800.00);

-- =======================================================
-- MIGRACION: para bases existentes ejecutar este ALTER
-- =======================================================
-- ALTER TABLE tbl_suscripcion
--   ADD COLUMN precio_instalacion DECIMAL(10,2) DEFAULT 0.00
--   COMMENT 'Costo unico del sistema (solo LOCAL)'
--   AFTER id_plan;