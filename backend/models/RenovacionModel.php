<?php
// models/RenovacionModel.php

class RenovacionModel
{
  private PDO $db;

  public function __construct()
  {
    $this->db = Database::getConnection();
  }

  public function getAll(): array
  {
    $stmt = $this->db->query(
      "SELECT r.*, s.id_cliente, c.nombre_empresa
             FROM tbl_renovacion r
             INNER JOIN tbl_suscripcion s ON r.id_suscripcion = s.id
             INNER JOIN tbl_cliente     c ON s.id_cliente     = c.id
             ORDER BY r.id"
    );
    return $stmt->fetchAll();
  }

  public function getById(int $id)
  {
    $stmt = $this->db->prepare(
      "SELECT r.*, s.id_cliente, c.nombre_empresa
             FROM tbl_renovacion r
             INNER JOIN tbl_suscripcion s ON r.id_suscripcion = s.id
             INNER JOIN tbl_cliente     c ON s.id_cliente     = c.id
             WHERE r.id = ?"
    );
    $stmt->execute([$id]);
    return $stmt->fetch();
  }

  public function getBySuscripcion(int $idSuscripcion): array
  {
    $stmt = $this->db->prepare(
      "SELECT * FROM tbl_renovacion WHERE id_suscripcion = ? ORDER BY id"
    );
    $stmt->execute([$idSuscripcion]);
    return $stmt->fetchAll();
  }

  public function create(array $data): int
  {
    $stmt = $this->db->prepare(
      "INSERT INTO tbl_renovacion (id_suscripcion, fecha_inicio, fecha_fin, meses, precio)
             VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([
      (int)   $data['id_suscripcion'],
      $data['fecha_inicio'],
      $data['fecha_fin'],
      (int)   $data['meses'],
      (float) ($data['precio'] ?? 0.00),
    ]);
    return (int) $this->db->lastInsertId();
  }

  public function update(int $id, array $data): bool
  {
    $fields = [];
    $values = [];

    $allowed = ['fecha_inicio', 'fecha_fin', 'meses', 'precio'];
    foreach ($allowed as $field) {
      if (array_key_exists($field, $data)) {
        $fields[] = "$field = ?";
        $values[] = $data[$field];
      }
    }

    if (empty($fields)) return false;

    $values[] = $id;
    $stmt = $this->db->prepare(
      "UPDATE tbl_renovacion SET " . implode(', ', $fields) . " WHERE id = ?"
    );
    return $stmt->execute($values);
  }

  public function delete(int $id): bool
  {
    $stmt = $this->db->prepare("DELETE FROM tbl_renovacion WHERE id = ?");
    return $stmt->execute([$id]);
  }
}
