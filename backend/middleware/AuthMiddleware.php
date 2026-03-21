<?php
// middleware/AuthMiddleware.php

require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/JwtHelper.php';

// Middleware para proteger rutas que requieren autenticación
class AuthMiddleware
{
  public static function requiereToken()
  {
    $headers = function_exists('getallheaders') ? getallheaders() : [];

    if (!isset($headers['Authorization'])) {
      Response::json(401, ['error' => 'Token requerido en el header Authorization']);
    }

    $authHeader = $headers['Authorization'];

    if (substr($authHeader, 0, 7) !== 'Bearer ') {
      Response::json(400, ['error' => 'Formato de token inválido. Use: Bearer {token}']);
    }

    $token = substr($authHeader, 7);

    try {
      $data = JwtHelper::validarToken($token);
      // Puedes almacenar esto en una variable global o devolverlo
      return $data;
    } catch (Exception $e) {
      Response::json(403, ['error' => 'Token inválido o expirado', 'detalle' => $e->getMessage()]);
    }
  }
}
