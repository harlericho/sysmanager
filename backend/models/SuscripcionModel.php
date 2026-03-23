<?php
// models/SuscripcionModel.php

class SuscripcionModel
{
  private PDO $db;

  public function __construct()
  {
    $this->db = Database::getConnection();
  }

  public function getAll(): array
  {
    $stmt = $this->db->query(
      "SELECT s.*, c.nombre_empresa, p.nombre AS nombre_plan, p.tipo AS tipo_plan
             FROM tbl_suscripcion s
             INNER JOIN tbl_cliente c ON s.id_cliente = c.id
             INNER JOIN tbl_plan    p ON s.id_plan    = p.id
             ORDER BY s.id"
    );
    return $stmt->fetchAll();
  }

  public function getById(int $id)
  {
    $stmt = $this->db->prepare(
      "SELECT s.*, c.nombre_empresa, c.email, p.nombre AS nombre_plan, p.tipo AS tipo_plan
             FROM tbl_suscripcion s
             INNER JOIN tbl_cliente c ON s.id_cliente = c.id
             INNER JOIN tbl_plan    p ON s.id_plan    = p.id
             WHERE s.id = ?"
    );
    $stmt->execute([$id]);
    return $stmt->fetch();
  }

  public function getByCliente(int $idCliente): array
  {
    $stmt = $this->db->prepare(
      "SELECT s.*, p.nombre AS nombre_plan
             FROM tbl_suscripcion s
             INNER JOIN tbl_plan p ON s.id_plan = p.id
             WHERE s.id_cliente = ?
             ORDER BY s.id"
    );
    $stmt->execute([$idCliente]);
    return $stmt->fetchAll();
  }

  public function create(array $data): int
  {
    $stmt = $this->db->prepare(
      "INSERT INTO tbl_suscripcion
               (id_cliente, id_plan, precio_instalacion, fecha_inicio, fecha_fin, tipo_pago, estado, creado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
      (int) $data['id_cliente'],
      (int) $data['id_plan'],
      isset($data['precio_instalacion']) ? (float) $data['precio_instalacion'] : 0.00,
      $data['fecha_inicio'],
      $data['fecha_fin'],
      $data['tipo_pago'],
      $data['estado']     ?? 'ACTIVO',
      $data['creado_por'] ?? null,
    ]);
    return (int) $this->db->lastInsertId();
  }

  public function update(int $id, array $data): bool
  {
    $fields = [];
    $values = [];

    $allowed = ['id_cliente', 'id_plan', 'precio_instalacion', 'fecha_inicio', 'fecha_fin', 'tipo_pago', 'estado'];
    foreach ($allowed as $field) {
      if (array_key_exists($field, $data)) {
        $fields[] = "$field = ?";
        $values[] = $data[$field];
      }
    }

    if (empty($fields)) return false;

    $values[] = $id;
    $stmt = $this->db->prepare(
      "UPDATE tbl_suscripcion SET " . implode(', ', $fields) . " WHERE id = ?"
    );
    return $stmt->execute($values);
  }

  public function delete(int $id): bool
  {
    $stmt = $this->db->prepare(
      "UPDATE tbl_suscripcion SET estado = 'CANCELADO' WHERE id = ?"
    );
    return $stmt->execute([$id]);
  }
}
