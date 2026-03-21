<?php
// models/UsuarioModel.php

class UsuarioModel
{
  private PDO $db;

  public function __construct()
  {
    $this->db = Database::getConnection();
  }

  public function getAll(): array
  {
    $stmt = $this->db->query(
      "SELECT id, nombres, usuario, rol, estado FROM tbl_usuario ORDER BY id"
    );
    return $stmt->fetchAll();
  }

  public function getById(int $id)
  {
    $stmt = $this->db->prepare(
      "SELECT id, nombres, usuario, rol, estado FROM tbl_usuario WHERE id = ?"
    );
    $stmt->execute([$id]);
    return $stmt->fetch();
  }

  public function getByUsuario(string $usuario)
  {
    $stmt = $this->db->prepare(
      "SELECT * FROM tbl_usuario WHERE usuario = ? AND estado = 'A'"
    );
    $stmt->execute([$usuario]);
    return $stmt->fetch();
  }

  public function create(array $data): int
  {
    $stmt = $this->db->prepare(
      "INSERT INTO tbl_usuario (nombres, usuario, password, rol, estado)
             VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([
      $data['nombres'],
      $data['usuario'],
      password_hash($data['password'], PASSWORD_BCRYPT),
      $data['rol'],
      $data['estado'] ?? 'A',
    ]);
    return (int) $this->db->lastInsertId();
  }

  public function update(int $id, array $data): bool
  {
    $fields = [];
    $values = [];

    if (!empty($data['nombres'])) {
      $fields[] = 'nombres = ?';
      $values[] = $data['nombres'];
    }
    if (!empty($data['usuario'])) {
      $fields[] = 'usuario = ?';
      $values[] = $data['usuario'];
    }
    if (!empty($data['password'])) {
      $fields[] = 'password = ?';
      $values[] = password_hash($data['password'], PASSWORD_BCRYPT);
    }
    if (!empty($data['rol'])) {
      $fields[] = 'rol = ?';
      $values[] = $data['rol'];
    }
    if (isset($data['estado'])) {
      $fields[] = 'estado = ?';
      $values[] = $data['estado'];
    }

    if (empty($fields)) return false;

    $values[] = $id;
    $stmt = $this->db->prepare(
      "UPDATE tbl_usuario SET " . implode(', ', $fields) . " WHERE id = ?"
    );
    return $stmt->execute($values);
  }

  public function delete(int $id): bool
  {
    $stmt = $this->db->prepare("UPDATE tbl_usuario SET estado = 'I' WHERE id = ?");
    return $stmt->execute([$id]);
  }
}
