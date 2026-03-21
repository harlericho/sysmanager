<?php
// models/ClienteModel.php

class ClienteModel
{
  private PDO $db;

  public function __construct()
  {
    $this->db = Database::getConnection();
  }

  public function getAll(): array
  {
    $stmt = $this->db->query("SELECT * FROM tbl_cliente ORDER BY id");
    return $stmt->fetchAll();
  }

  public function getById(int $id)
  {
    $stmt = $this->db->prepare("SELECT * FROM tbl_cliente WHERE id = ?");
    $stmt->execute([$id]);
    return $stmt->fetch();
  }

  public function create(array $data): int
  {
    $stmt = $this->db->prepare(
      "INSERT INTO tbl_cliente (ruc, nombre_empresa, usuario, email, telefono, estado)
             VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
      $data['ruc']            ?? null,
      $data['nombre_empresa'],
      $data['usuario']        ?? null,
      $data['email']          ?? null,
      $data['telefono']       ?? null,
      $data['estado']         ?? 'A',
    ]);
    return (int) $this->db->lastInsertId();
  }

  public function update(int $id, array $data): bool
  {
    $fields = [];
    $values = [];

    $allowed = ['ruc', 'nombre_empresa', 'usuario', 'email', 'telefono', 'estado'];
    foreach ($allowed as $field) {
      if (array_key_exists($field, $data)) {
        $fields[] = "$field = ?";
        $values[] = $data[$field];
      }
    }

    if (empty($fields)) return false;

    $values[] = $id;
    $stmt = $this->db->prepare(
      "UPDATE tbl_cliente SET " . implode(', ', $fields) . " WHERE id = ?"
    );
    return $stmt->execute($values);
  }

  public function delete(int $id): bool
  {
    $stmt = $this->db->prepare("UPDATE tbl_cliente SET estado = 'I' WHERE id = ?");
    return $stmt->execute([$id]);
  }
}
