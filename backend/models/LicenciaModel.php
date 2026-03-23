<?php
// models/LicenciaModel.php

class LicenciaModel
{
  private PDO $db;

  public function __construct()
  {
    $this->db = Database::getConnection();
  }

  public function getAll(): array
  {
    $stmt = $this->db->query(
      "SELECT l.*,
              CASE
                WHEN l.estado IN ('REVOCADA','VENCIDA') THEN l.estado
                WHEN l.fecha_vencimiento < CURDATE()    THEN 'VENCIDA'
                ELSE 'ACTIVA'
              END AS estado_display,
              DATEDIFF(l.fecha_vencimiento, CURDATE()) AS dias_restantes,
              c.nombre_empresa, p.nombre AS nombre_plan, s.tipo_pago
             FROM tbl_licencia l
             INNER JOIN tbl_suscripcion s ON l.id_suscripcion = s.id
             INNER JOIN tbl_cliente     c ON s.id_cliente     = c.id
             INNER JOIN tbl_plan        p ON s.id_plan        = p.id
             ORDER BY l.id DESC"
    );
    return $stmt->fetchAll();
  }

  public function getById(int $id)
  {
    $stmt = $this->db->prepare(
      "SELECT l.*,
              CASE
                WHEN l.estado IN ('REVOCADA','VENCIDA') THEN l.estado
                WHEN l.fecha_vencimiento < CURDATE()    THEN 'VENCIDA'
                ELSE 'ACTIVA'
              END AS estado_display,
              DATEDIFF(l.fecha_vencimiento, CURDATE()) AS dias_restantes,
              c.nombre_empresa, c.email, p.nombre AS nombre_plan, s.tipo_pago
             FROM tbl_licencia l
             INNER JOIN tbl_suscripcion s ON l.id_suscripcion = s.id
             INNER JOIN tbl_cliente     c ON s.id_cliente     = c.id
             INNER JOIN tbl_plan        p ON s.id_plan        = p.id
             WHERE l.id = ?"
    );
    $stmt->execute([$id]);
    return $stmt->fetch();
  }

  public function claveExiste(string $clave): bool
  {
    $stmt = $this->db->prepare("SELECT id FROM tbl_licencia WHERE clave_licencia = ?");
    $stmt->execute([$clave]);
    return (bool) $stmt->fetch();
  }

  public function create(array $data): int
  {
    $stmt = $this->db->prepare(
      "INSERT INTO tbl_licencia
               (id_suscripcion, clave_licencia, estado, observaciones, fecha_emision, fecha_vencimiento, creado_por)
             VALUES (?, ?, 'ACTIVA', ?, ?, ?, ?)"
    );
    $stmt->execute([
      (int) $data['id_suscripcion'],
      $data['clave_licencia'],
      $data['observaciones'] ?? null,
      $data['fecha_emision'],
      $data['fecha_vencimiento'],
      (int) $data['creado_por'],
    ]);
    return (int) $this->db->lastInsertId();
  }

  public function update(int $id, array $data): bool
  {
    $campos = [];
    $params = [];

    if (array_key_exists('observaciones', $data)) {
      $campos[] = 'observaciones = ?';
      $params[] = $data['observaciones'];
    }
    if (isset($data['estado'])) {
      $campos[] = 'estado = ?';
      $params[] = $data['estado'];
    }
    if (isset($data['clave_licencia'])) {
      $campos[] = 'clave_licencia = ?';
      $params[] = $data['clave_licencia'];
    }

    if (empty($campos)) return false;

    $params[] = $id;
    $stmt = $this->db->prepare(
      "UPDATE tbl_licencia SET " . implode(', ', $campos) . " WHERE id = ?"
    );
    return $stmt->execute($params);
  }

  public function revocar(int $id): bool
  {
    $stmt = $this->db->prepare("UPDATE tbl_licencia SET estado = 'REVOCADA' WHERE id = ?");
    return $stmt->execute([$id]);
  }

  // Marca como VENCIDA todas las licencias ACTIVAS de una suscripcion (al renovar)
  public function vencerBySuscripcion(int $idSuscripcion): bool
  {
    $stmt = $this->db->prepare(
      "UPDATE tbl_licencia SET estado = 'VENCIDA'
             WHERE id_suscripcion = ? AND estado = 'ACTIVA'"
    );
    return $stmt->execute([$idSuscripcion]);
  }

  // Verifica si ya existe una licencia ACTIVA (o no vencida aun) para una suscripcion
  public function tieneActivaBySuscripcion(int $idSuscripcion): bool
  {
    $stmt = $this->db->prepare(
      "SELECT id FROM tbl_licencia
             WHERE id_suscripcion = ? AND estado = 'ACTIVA'
               AND fecha_vencimiento >= CURDATE() LIMIT 1"
    );
    $stmt->execute([$idSuscripcion]);
    return (bool) $stmt->fetch();
  }
}
