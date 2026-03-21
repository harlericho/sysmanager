<?php
// controllers/AuthController.php

class AuthController
{
  private UsuarioModel $model;

  public function __construct()
  {
    $this->model = new UsuarioModel();
  }

  public function login(): void
  {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['usuario']) || empty($data['password'])) {
      Response::json(400, ['error' => 'Los campos usuario y password son requeridos']);
    }

    $user = $this->model->getByUsuario($data['usuario']);

    if (!$user || !password_verify($data['password'], $user['password'])) {
      Response::json(401, ['error' => 'Credenciales incorrectas']);
    }

    $token = JwtHelper::generarToken([
      'sub'     => $user['id'],
      'usuario' => $user['usuario'],
      'rol'     => $user['rol'],
    ]);

    Response::json(200, [
      'token'   => $token,
      'usuario' => [
        'id'      => $user['id'],
        'nombres' => $user['nombres'],
        'usuario' => $user['usuario'],
        'rol'     => $user['rol'],
      ],
    ]);
  }

  public function me($tokenData): void
  {
    Response::json(200, [
      'id'      => $tokenData->sub,
      'usuario' => $tokenData->usuario,
      'rol'     => $tokenData->rol,
    ]);
  }
}
