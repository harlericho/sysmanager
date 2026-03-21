<?php
// controllers/PlanController.php

class PlanController
{
  private PlanModel $model;

  public function __construct()
  {
    $this->model = new PlanModel();
  }

  public function index($tokenData): void
  {
    Response::json(200, $this->model->getAll());
  }

  public function show(int $id, $tokenData): void
  {
    $item = $this->model->getById($id);
    if (!$item) {
      Response::json(404, ['error' => 'Plan no encontrado']);
    }
    Response::json(200, $item);
  }

  public function store($tokenData): void
  {
    if ($tokenData->rol !== 'ADMIN') {
      Response::json(403, ['error' => 'Acceso denegado. Solo ADMIN puede crear planes']);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['nombre']) || empty($data['tipo']) || empty($data['duracion_base'])) {
      Response::json(400, ['error' => 'Campos requeridos: nombre, tipo, duracion_base']);
    }

    if (!in_array($data['tipo'], ['NUBE', 'LOCAL'])) {
      Response::json(400, ['error' => 'El tipo debe ser NUBE o LOCAL']);
    }

    $id = $this->model->create($data);
    Response::json(201, ['id' => $id, 'mensaje' => 'Plan creado correctamente']);
  }

  public function update(int $id, $tokenData): void
  {
    if ($tokenData->rol !== 'ADMIN') {
      Response::json(403, ['error' => 'Acceso denegado. Solo ADMIN puede modificar planes']);
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data)) {
      Response::json(400, ['error' => 'No se enviaron datos para actualizar']);
    }

    $ok = $this->model->update($id, $data);
    if (!$ok) {
      Response::json(404, ['error' => 'Plan no encontrado o sin cambios']);
    }
    Response::json(200, ['mensaje' => 'Plan actualizado correctamente']);
  }

  public function destroy(int $id, $tokenData): void
  {
    if ($tokenData->rol !== 'ADMIN') {
      Response::json(403, ['error' => 'Acceso denegado. Solo ADMIN puede eliminar planes']);
    }
    $this->model->delete($id);
    Response::json(200, ['mensaje' => 'Plan desactivado correctamente']);
  }
}
