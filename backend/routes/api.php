<?php
// routes/api.php

$method = $_SERVER['REQUEST_METHOD'];

// Normalizar URI eliminando el subdirectorio base
$scriptDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$uri       = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri       = '/' . trim(substr($uri, strlen($scriptDir)), '/');

$segments = array_values(array_filter(explode('/', $uri)));
$resource = $segments[0] ?? '';
$sub      = $segments[1] ?? null;
$action   = $segments[2] ?? null;
$id       = ($sub !== null && ctype_digit((string) $sub)) ? (int) $sub : null;

// =====================
//  AUTH — rutas públicas
// =====================
if ($resource === 'auth') {
  $ctrl = new AuthController();

  if ($method === 'POST' && $sub === 'login') {
    $ctrl->login();
    return;
  }

  if ($method === 'GET' && $sub === 'me') {
    $tokenData = AuthMiddleware::requiereToken();
    $ctrl->me($tokenData);
    return;
  }

  Response::json(404, ['error' => 'Ruta no encontrada']);
}

// =====================
//  RUTAS PROTEGIDAS
// =====================
$tokenData = AuthMiddleware::requiereToken();

$map = [
  'usuarios'      => 'UsuarioController',
  'clientes'      => 'ClienteController',
  'planes'        => 'PlanController',
  'suscripciones' => 'SuscripcionController',
  'renovaciones'  => 'RenovacionController',
  'licencias'     => 'LicenciaController',
];

if (!array_key_exists($resource, $map)) {
  Response::json(404, ['error' => "Recurso '$resource' no encontrado"]);
}

$ctrl = new $map[$resource]();

if ($method === 'GET'    && $id === null) {
  $ctrl->index($tokenData);
} elseif ($method === 'GET') {
  $ctrl->show($id, $tokenData);
} elseif ($method === 'POST' && $id !== null && $action === 'enviar-correo') {
  $ctrl->sendMail($id, $tokenData);
} elseif ($method === 'POST' && $id !== null && $action === 'regenerar-clave') {
  $ctrl->regenerarClave($id, $tokenData);
} elseif ($method === 'POST') {
  $ctrl->store($tokenData);
} elseif ($method === 'PUT'   && $id !== null) {
  $ctrl->update($id, $tokenData);
} elseif ($method === 'PATCH' && $id !== null) {
  $ctrl->update($id, $tokenData);
} elseif ($method === 'DELETE' && $id !== null) {
  $ctrl->destroy($id, $tokenData);
} else {
  Response::json(405, ['error' => 'Método no permitido']);
}
