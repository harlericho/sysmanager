<?php
// controllers/UsuarioController.php

class UsuarioController
{
  private UsuarioModel $model;

  public function __construct()
  {
    $this->model = new UsuarioModel();
  }

  public function index($tokenData): void
  {
    if ($tokenData->rol !== 'ADMIN') {
      Response::json(403, ['error' => 'Acceso denegado. Solo ADMIN puede listar usuarios']);
    }
    Response::json(200, $this->model->getAll());
  }

  public function show(int $id, $tokenData): void
  {
    $item = $this->model->getById($id);
    if (!$item) {
      Response::json(404, ['error' => 'Usuario no encontrado']);
    }
    Response::json(200, $item);
  }

  public function store($tokenData): void
  {
    if ($tokenData->rol !== 'ADMIN') {
      Response::json(403, ['error' => 'Acceso denegado. Solo ADMIN puede crear usuarios']);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['nombres']) || empty($data['usuario']) || empty($data['password']) || empty($data['rol'])) {
      Response::json(400, ['error' => 'Campos requeridos: nombres, usuario, password, rol']);
    }

    if (!in_array($data['rol'], ['ADMIN', 'EMPLEADO'])) {
      Response::json(400, ['error' => 'El rol debe ser ADMIN o EMPLEADO']);
    }

    $id = $this->model->create($data);
    Response::json(201, ['id' => $id, 'mensaje' => 'Usuario creado correctamente']);
  }

  public function update(int $id, $tokenData): void
  {
    if ($tokenData->rol !== 'ADMIN') {
      Response::json(403, ['error' => 'Acceso denegado. Solo ADMIN puede modificar usuarios']);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data)) {
      Response::json(400, ['error' => 'No se enviaron datos para actualizar']);
    }

    $ok = $this->model->update($id, $data);
    if (!$ok) {
      Response::json(404, ['error' => 'Usuario no encontrado o sin cambios']);
    }
    Response::json(200, ['mensaje' => 'Usuario actualizado correctamente']);
  }

  public function destroy(int $id, $tokenData): void
  {
    if ($tokenData->rol !== 'ADMIN') {
      Response::json(403, ['error' => 'Acceso denegado. Solo ADMIN puede eliminar usuarios']);
    }
    $this->model->delete($id);
    Response::json(200, ['mensaje' => 'Usuario desactivado correctamente']);
  }
}
