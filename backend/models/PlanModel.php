<?php
// models/PlanModel.php

class PlanModel
{
  private PDO $db;

  public function __construct()
  {
    $this->db = Database::getConnection();
  }

  public function getAll(): array
  {
    $stmt = $this->db->query("SELECT * FROM tbl_plan ORDER BY id");
    return $stmt->fetchAll();
  }

  public function getById(int $id)
  {
    $stmt = $this->db->prepare("SELECT * FROM tbl_plan WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
  }

  public function create(array $data): int
  {
    $stmt = $this->db->prepare(
      "INSERT INTO tbl_plan (nombre, tipo, duracion_base, precio, permite_renovacion, estado)
             VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
      $data['nombre'],
      $data['tipo'],
      (int)   $data['duracion_base'],
      (float) ($data['precio']             ?? 0.00),
      isset($data['permite_renovacion']) ? (int) $data['permite_renovacion'] : 1,
      $data['estado'] ?? 'A',
    ]);
    return (int) $this->db->lastInsertId();
  }

  public function update(int $id, array $data): bool
  {
    $fields = [];
    $values = [];

    $allowed = ['nombre', 'tipo', 'duracion_base', 'precio', 'permite_renovacion', 'estado'];
    foreach ($allowed as $field) {
      if (array_key_exists($field, $data)) {
        $fields[] = "$field = ?";
        $values[] = $data[$field];
      }
    }

    if (empty($fields)) return false;

    $values[] = $id;
    $stmt = $this->db->prepare(
      "UPDATE tbl_plan SET " . implode(', ', $fields) . " WHERE id = ?"
    );
    return $stmt->execute($values);
  }

  public function delete(int $id): bool
  {
    $stmt = $this->db->prepare("UPDATE tbl_plan SET estado = 'I' WHERE id = ?");
    return $stmt->execute([$id]);
  }
}
