<?php
// controllers/SuscripcionController.php

class SuscripcionController
{
  private SuscripcionModel $model;

  public function __construct()
  {
    $this->model = new SuscripcionModel();
  }

  public function index($tokenData): void
  {
    Response::json(200, $this->model->getAll());
  }

  public function show(int $id, $tokenData): void
  {
    $item = $this->model->getById($id);
    if (!$item) {
      Response::json(404, ['error' => 'Suscripción no encontrada']);
    }
    Response::json(200, $item);
  }

  public function store($tokenData): void
  {
    $data = json_decode(file_get_contents('php://input'), true);

    $required = ['id_cliente', 'id_plan', 'fecha_inicio', 'fecha_fin', 'tipo_pago'];
    foreach ($required as $field) {
      if (empty($data[$field])) {
        Response::json(400, ['error' => "Campo requerido: $field"]);
      }
    }

    if (!in_array($data['tipo_pago'], ['MENSUAL', 'ANUAL', 'LICENCIA'])) {
      Response::json(400, ['error' => 'tipo_pago debe ser MENSUAL, ANUAL o LICENCIA']);
    }

    $data['creado_por'] = $tokenData->sub;

    $id = $this->model->create($data);

    // Enviar correo de bienvenida al cliente (sin interrumpir la respuesta si falla)
    $suscripcion = $this->model->getById($id);
    if ($suscripcion && !empty($suscripcion['email'])) {
      MailHelper::enviarBienvenida($suscripcion, $suscripcion['email']);
    }

    // Si el tipo de pago es LICENCIA, generar la licencia automaticamente
    if ($data['tipo_pago'] === 'LICENCIA' && $suscripcion) {
      $licModel = new LicenciaModel();
      LicenciaController::generarParaSuscripcion(
        $id,
        $suscripcion['fecha_fin'],
        $tokenData->sub,
        $licModel,
        'Licencia inicial — generada automaticamente al contratar'
      );
    }

    Response::json(201, ['id' => $id, 'mensaje' => 'Suscripción creada correctamente']);
  }

  public function update(int $id, $tokenData): void
  {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data)) {
      Response::json(400, ['error' => 'No se enviaron datos para actualizar']);
    }

    $ok = $this->model->update($id, $data);
    if (!$ok) {
      Response::json(404, ['error' => 'Suscripción no encontrada o sin cambios']);
    }
    Response::json(200, ['mensaje' => 'Suscripción actualizada correctamente']);
  }

  public function destroy(int $id, $tokenData): void
  {
    $this->model->delete($id);
    Response::json(200, ['mensaje' => 'Suscripción cancelada correctamente']);
  }

  public function sendMail(int $id, $tokenData): void
  {
    $suscripcion = $this->model->getById($id);
    if (!$suscripcion) {
      Response::json(404, ['error' => 'Suscripción no encontrada']);
    }
    if (empty($suscripcion['email'])) {
      Response::json(422, ['error' => 'El cliente no tiene correo electrónico registrado']);
    }
    $enviado = MailHelper::enviarBienvenida($suscripcion, $suscripcion['email']);
    if ($enviado) {
      Response::json(200, ['mensaje' => 'Correo enviado correctamente a ' . $suscripcion['email']]);
    } else {
      Response::json(500, ['error' => 'No se pudo enviar el correo. Verifique la configuración SMTP.']);
    }
  }
}
