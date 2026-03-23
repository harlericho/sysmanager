<?php
// controllers/LicenciaController.php

class LicenciaController
{
  private LicenciaModel $model;

  public function __construct()
  {
    $this->model = new LicenciaModel();
  }

  public function index($tokenData): void
  {
    Response::json(200, $this->model->getAll());
  }

  public function show(int $id, $tokenData): void
  {
    $item = $this->model->getById($id);
    if (!$item) {
      Response::json(404, ['error' => 'Licencia no encontrada']);
    }
    Response::json(200, $item);
  }

  public function store($tokenData): void
  {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['id_suscripcion'])) {
      Response::json(400, ['error' => 'Campo requerido: id_suscripcion']);
    }

    // Obtener fecha_fin de la suscripcion como fecha de vencimiento
    $susModel = new SuscripcionModel();
    $sus = $susModel->getById((int) $data['id_suscripcion']);
    if (!$sus) {
      Response::json(404, ['error' => 'Suscripcion no encontrada']);
    }

    $clave = $this->generarClaveUnica();
    $data['clave_licencia']   = $clave;
    $data['fecha_emision']    = date('Y-m-d');
    $data['fecha_vencimiento'] = $sus['fecha_fin'];
    $data['creado_por']       = $tokenData->sub;

    $id = $this->model->create($data);

    Response::json(201, [
      'id'               => $id,
      'clave_licencia'   => $clave,
      'fecha_vencimiento' => $sus['fecha_fin'],
      'mensaje'          => 'Licencia generada correctamente',
    ]);
  }

  public function update(int $id, $tokenData): void
  {
    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data)) {
      Response::json(400, ['error' => 'No se enviaron datos para actualizar']);
    }

    $this->model->update($id, $data);
    Response::json(200, ['mensaje' => 'Licencia actualizada correctamente']);
  }

  public function destroy(int $id, $tokenData): void
  {
    $licencia = $this->model->getById($id);
    if (!$licencia) {
      Response::json(404, ['error' => 'Licencia no encontrada']);
    }
    $this->model->revocar($id);
    Response::json(200, ['mensaje' => 'Licencia revocada correctamente']);
  }

  public function regenerarClave(int $id, $tokenData): void
  {
    $licencia = $this->model->getById($id);
    if (!$licencia) {
      Response::json(404, ['error' => 'Licencia no encontrada']);
    }
    if ($licencia['estado'] === 'REVOCADA') {
      Response::json(400, ['error' => 'No se puede regenerar clave de una licencia revocada']);
    }

    $nuevaClave = $this->generarClaveUnica();
    $this->model->update($id, ['clave_licencia' => $nuevaClave]);

    Response::json(200, [
      'clave_licencia'   => $nuevaClave,
      'fecha_vencimiento' => $licencia['fecha_vencimiento'],
      'mensaje'          => 'Clave regenerada correctamente',
    ]);
  }

  // Método estatico para uso interno (SuscripcionController, RenovacionController)
  public static function generarParaSuscripcion(
    int $idSuscripcion,
    string $fechaVencimiento,
    int $creadoPor,
    LicenciaModel $model,
    ?string $observaciones = null
  ): string {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $len   = strlen($chars);
    do {
      $partes = [];
      for ($i = 0; $i < 4; $i++) {
        $bloque = '';
        for ($j = 0; $j < 4; $j++) {
          $bloque .= $chars[random_int(0, $len - 1)];
        }
        $partes[] = $bloque;
      }
      $clave = 'SYS-' . implode('-', $partes);
    } while ($model->claveExiste($clave));

    $model->create([
      'id_suscripcion'   => $idSuscripcion,
      'clave_licencia'   => $clave,
      'fecha_emision'    => date('Y-m-d'),
      'fecha_vencimiento' => $fechaVencimiento,
      'creado_por'       => $creadoPor,
      'observaciones'    => $observaciones,
    ]);

    return $clave;
  }

  private function generarClaveUnica(): string
  {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $len   = strlen($chars);
    do {
      $partes = [];
      for ($i = 0; $i < 4; $i++) {
        $bloque = '';
        for ($j = 0; $j < 4; $j++) {
          $bloque .= $chars[random_int(0, $len - 1)];
        }
        $partes[] = $bloque;
      }
      $clave = 'SYS-' . implode('-', $partes);
    } while ($this->model->claveExiste($clave));

    return $clave;
  }
}
