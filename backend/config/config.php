<?php
// config/config.php

$dbConfig   = parse_ini_file(__DIR__ . '/init/config.ini');
$jwtConfig  = parse_ini_file(__DIR__ . '/init/jwt.ini');
$mailConfig = parse_ini_file(__DIR__ . '/init/mail.ini');

if (!$dbConfig || !$jwtConfig || !$mailConfig) {
  die("Error: No se pudieron cargar los archivos de configuración .ini");
}

// Configuración de DB
define('DB_HOST', $dbConfig['DB_HOST']);
define('DB_NAME', $dbConfig['DB_NAME']);
define('DB_USER', $dbConfig['DB_USER']);
define('DB_PASS', $dbConfig['DB_PASS']);
define('DB_PORT', (int)$dbConfig['DB_PORT']);

// Configuración de JWT
define('JWT_SECRET', $jwtConfig['JWT_SECRET']);
define('JWT_EXPIRATION', (int)$jwtConfig['JWT_EXPIRATION']);
