<?php
// controllers/RenovacionController.php

class RenovacionController
{
  private RenovacionModel $model;

  public function __construct()
  {
    $this->model = new RenovacionModel();
  }

  public function index($tokenData): void
  {
    Response::json(200, $this->model->getAll());
  }

  public function show(int $id, $tokenData): void
  {
    $item = $this->model->getById($id);
    if (!$item) {
      Response::json(404, ['error' => 'Renovación no encontrada']);
    }
    Response::json(200, $item);
  }

  public function store($tokenData): void
  {
    $data = json_decode(file_get_contents('php://input'), true);

    $required = ['id_suscripcion', 'fecha_inicio', 'fecha_fin', 'meses'];
    foreach ($required as $field) {
      if (empty($data[$field])) {
        Response::json(400, ['error' => "Campo requerido: $field"]);
      }
    }

    $id = $this->model->create($data);

    // Enviar correo de confirmación de renovación (no interrumpe si falla)
    $renovacion = $this->model->getById($id);
    if ($renovacion && !empty($renovacion['email'])) {
      MailHelper::enviarRenovacion($renovacion, $renovacion['email']);
    }

    // Si la suscripcion es de tipo LICENCIA, vencer la licencia anterior y crear una nueva
    if ($renovacion && $renovacion['tipo_pago'] === 'LICENCIA') {
      $licModel = new LicenciaModel();
      $licModel->vencerBySuscripcion((int) $data['id_suscripcion']);
      LicenciaController::generarParaSuscripcion(
        (int) $data['id_suscripcion'],
        $renovacion['fecha_fin'],
        $tokenData->sub,
        $licModel,
        'Licencia renovada — ' . $renovacion['meses'] . ' mes(es) desde ' . $renovacion['fecha_inicio']
      );
    }

    Response::json(201, ['id' => $id, 'mensaje' => 'Renovación registrada correctamente']);
  }

  public function update(int $id, $tokenData): void
  {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data)) {
      Response::json(400, ['error' => 'No se enviaron datos para actualizar']);
    }

    $ok = $this->model->update($id, $data);
    if (!$ok) {
      Response::json(404, ['error' => 'Renovación no encontrada o sin cambios']);
    }
    Response::json(200, ['mensaje' => 'Renovación actualizada correctamente']);
  }

  public function destroy(int $id, $tokenData): void
  {
    $this->model->delete($id);
    Response::json(200, ['mensaje' => 'Renovación eliminada correctamente']);
  }
}
