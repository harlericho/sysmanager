<?php
// helpers/MailHelper.php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

class MailHelper
{
  /**
   * Envía el correo de bienvenida al cliente cuando se crea una suscripción.
   *
   * @param array $suscripcion  Fila de tbl_suscripcion con joins (nombre_empresa, nombre_plan, etc.)
   * @param string $emailCliente Dirección de correo del cliente
   */
  public static function enviarBienvenida(array $suscripcion, string $emailCliente): bool
  {
    $mailConfig = parse_ini_file(__DIR__ . '/../config/init/mail.ini');
    if (!$mailConfig) return false;

    $mail = new PHPMailer(true);

    try {
      // ── Servidor SMTP ────────────────────────────────────────────
      $mail->isSMTP();
      $mail->Host       = $mailConfig['MAIL_HOST'];
      $mail->SMTPAuth   = true;
      $mail->Username   = $mailConfig['MAIL_USERNAME'];
      $mail->Password   = $mailConfig['MAIL_PASSWORD'];
      $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // SSL port 465
      $mail->Port       = (int) $mailConfig['MAIL_PORT'];
      $mail->CharSet    = 'UTF-8';

      // ── Remitente y destinatario ─────────────────────────────────
      $mail->setFrom($mailConfig['MAIL_FROM'], $mailConfig['MAIL_FROM_NAME']);
      $mail->addAddress($emailCliente, $suscripcion['nombre_empresa']);
      $mail->addReplyTo($mailConfig['MAIL_FROM'], $mailConfig['MAIL_FROM_NAME']);

      // ── Contenido ────────────────────────────────────────────────
      $mail->isHTML(true);
      $mail->Subject = '¡Bienvenido a SolucionesITEC! — Tu suscripción está activa';
      $mail->Body    = self::templateBienvenida($suscripcion);
      $mail->AltBody = self::templateTextoPlano($suscripcion);

      $mail->send();
      return true;
    } catch (Exception $e) {
      // Registrar el error sin interrumpir la respuesta al frontend
      error_log('[MailHelper] Error al enviar correo a ' . $emailCliente . ': ' . $mail->ErrorInfo);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // Template HTML
  // ─────────────────────────────────────────────────────────────────────
  private static function templateBienvenida(array $s): string
  {
    $empresa    = htmlspecialchars($s['nombre_empresa'] ?? '');
    $plan       = htmlspecialchars($s['nombre_plan']    ?? '');
    $tipoPlan   = htmlspecialchars($s['tipo_plan']      ?? '');
    $tipoPago   = htmlspecialchars($s['tipo_pago']      ?? '');
    $fechaInicio = htmlspecialchars($s['fecha_inicio']  ?? '');
    $fechaFin    = htmlspecialchars($s['fecha_fin']     ?? '');

    $badgeColor = $tipoPlan === 'NUBE' ? '#03c3ec' : '#696cff';
    $badgeLabel = $tipoPlan === 'NUBE' ? '☁️ Plan Nube' : '🖥️ Plan Local';

    return <<<HTML
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f9;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

          <!-- HEADER -->
          <tr>
            <td style="background:#696cff;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                SolucionesITEC
              </h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:14px;">
                Sistema de Gestión de Suscripciones
              </p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h2 style="margin:0 0 8px;color:#566a7f;font-size:20px;">
                ¡Bienvenido, <strong style="color:#696cff;">{$empresa}</strong>!
              </h2>
              <p style="margin:0 0 24px;color:#697a8d;font-size:15px;line-height:1.6;">
                Tu suscripción al sistema de <strong>SolucionesITEC</strong> ha sido registrada exitosamente.
                A continuación encontrarás los detalles de tu plan contratado.
              </p>

              <!-- Detalle suscripción -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#f8f8ff;border-radius:8px;border:1px solid #e0e0f0;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="6" cellspacing="0">
                      <tr>
                        <td style="color:#8592a3;font-size:13px;width:40%;">Plan contratado</td>
                        <td style="color:#566a7f;font-size:14px;font-weight:600;">
                          {$plan}
                          <span style="display:inline-block;margin-left:8px;padding:2px 10px;border-radius:20px;
                                       background:{$badgeColor};color:#fff;font-size:11px;font-weight:700;">
                            {$badgeLabel}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td style="color:#8592a3;font-size:13px;border-top:1px solid #e0e0f0;padding-top:10px;">Tipo de pago</td>
                        <td style="color:#566a7f;font-size:14px;font-weight:600;border-top:1px solid #e0e0f0;padding-top:10px;">{$tipoPago}</td>
                      </tr>
                      <tr>
                        <td style="color:#8592a3;font-size:13px;border-top:1px solid #e0e0f0;padding-top:10px;">Fecha de inicio</td>
                        <td style="color:#566a7f;font-size:14px;font-weight:600;border-top:1px solid #e0e0f0;padding-top:10px;">{$fechaInicio}</td>
                      </tr>
                      <tr>
                        <td style="color:#8592a3;font-size:13px;border-top:1px solid #e0e0f0;padding-top:10px;">Fecha de vencimiento</td>
                        <td style="color:#ff3e1d;font-size:14px;font-weight:600;border-top:1px solid #e0e0f0;padding-top:10px;">{$fechaFin}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px;color:#697a8d;font-size:14px;line-height:1.6;">
                Si tienes alguna pregunta o necesitas soporte, no dudes en contactarnos respondiendo
                este correo o escribiéndonos a
                <a href="mailto:info@solucionesitec.com" style="color:#696cff;text-decoration:none;">
                  info@solucionesitec.com
                </a>.
              </p>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:8px;">
                <a href="https://solucionesitec.com"
                   style="display:inline-block;padding:12px 32px;background:#696cff;color:#fff;
                          border-radius:6px;font-size:15px;font-weight:600;text-decoration:none;">
                  Visitar SolucionesITEC
                </a>
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f8f8ff;padding:20px 40px;text-align:center;border-top:1px solid #e0e0f0;">
              <p style="margin:0;color:#a1acb8;font-size:12px;line-height:1.6;">
                © 2025 SolucionesITEC · <a href="https://solucionesitec.com" style="color:#696cff;text-decoration:none;">solucionesitec.com</a><br/>
                Este correo fue enviado automáticamente. Por favor no lo respondas si no reconoces esta suscripción.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
HTML;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Versión texto plano (fallback)
  // ─────────────────────────────────────────────────────────────────────
  private static function templateTextoPlano(array $s): string
  {
    $empresa     = $s['nombre_empresa'] ?? '';
    $plan        = $s['nombre_plan']    ?? '';
    $tipoPago    = $s['tipo_pago']      ?? '';
    $fechaInicio = $s['fecha_inicio']   ?? '';
    $fechaFin    = $s['fecha_fin']      ?? '';

    return <<<TEXT
¡Bienvenido a SolucionesITEC, {$empresa}!

Tu suscripción ha sido registrada exitosamente.

Detalles:
  - Plan:               {$plan}
  - Tipo de pago:       {$tipoPago}
  - Fecha de inicio:    {$fechaInicio}
  - Fecha de vencimiento: {$fechaFin}

Soporte: info@solucionesitec.com
Web: https://solucionesitec.com

© SolucionesITEC
TEXT;
  }

  // ─────────────────────────────────────────────────────────────────────
  // Correo de renovación
  // ─────────────────────────────────────────────────────────────────────
  public static function enviarRenovacion(array $renovacion, string $emailCliente): bool
  {
    $mailConfig = parse_ini_file(__DIR__ . '/../config/init/mail.ini');
    if (!$mailConfig) return false;

    $mail = new PHPMailer(true);

    try {
      $mail->isSMTP();
      $mail->Host       = $mailConfig['MAIL_HOST'];
      $mail->SMTPAuth   = true;
      $mail->Username   = $mailConfig['MAIL_USERNAME'];
      $mail->Password   = $mailConfig['MAIL_PASSWORD'];
      $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
      $mail->Port       = (int) $mailConfig['MAIL_PORT'];
      $mail->CharSet    = 'UTF-8';

      $mail->setFrom($mailConfig['MAIL_FROM'], $mailConfig['MAIL_FROM_NAME']);
      $mail->addAddress($emailCliente, $renovacion['nombre_empresa']);
      $mail->addReplyTo($mailConfig['MAIL_FROM'], $mailConfig['MAIL_FROM_NAME']);

      $mail->isHTML(true);
      $mail->Subject = 'Renovación confirmada — ' . ($renovacion['nombre_plan'] ?? 'Tu plan') . ' | SolucionesITEC';
      $mail->Body    = self::templateRenovacionHtml($renovacion);
      $mail->AltBody = self::templateRenovacionTexto($renovacion);

      $mail->send();
      return true;
    } catch (Exception $e) {
      error_log('[MailHelper] Error correo renovación a ' . $emailCliente . ': ' . $mail->ErrorInfo);
      return false;
    }
  }

  private static function templateRenovacionHtml(array $r): string
  {
    $empresa     = htmlspecialchars($r['nombre_empresa'] ?? '');
    $plan        = htmlspecialchars($r['nombre_plan']    ?? '');
    $tipoPlan    = $r['tipo_plan'] ?? '';
    $meses       = htmlspecialchars((string)($r['meses'] ?? ''));
    $precio      = number_format((float)($r['precio'] ?? 0), 2);
    $fechaInicio = htmlspecialchars($r['fecha_inicio']   ?? '');
    $fechaFin    = htmlspecialchars($r['fecha_fin']      ?? '');

    $badgeColor = $tipoPlan === 'NUBE' ? '#03c3ec' : '#696cff';
    $badgeLabel = $tipoPlan === 'NUBE' ? '&#9729;&#65039; Plan Nube' : '&#128421;&#65039; Plan Local';

    return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/></head>'
      . '<body style="margin:0;padding:0;background:#f5f5f9;font-family:\'Segoe UI\',Arial,sans-serif;">'
      . '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f9;padding:30px 0;">'
      . '<tr><td align="center">'
      . '<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">'

      // Header
      . '<tr><td style="background:#696cff;padding:32px 40px;text-align:center;">'
      . '<h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">SolucionesITEC</h1>'
      . '<p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:14px;">Sistema de Gestión de Suscripciones</p>'
      . '</td></tr>'

      // Body
      . '<tr><td style="padding:40px 40px 24px;">'
      . '<h2 style="margin:0 0 8px;color:#566a7f;font-size:20px;">&#128260; Renovación confirmada, <strong style="color:#696cff;">' . $empresa . '</strong></h2>'
      . '<p style="margin:0 0 24px;color:#697a8d;font-size:15px;line-height:1.6;">Tu plan ha sido renovado exitosamente. A continuación los detalles.</p>'

      // Detalle tabla
      . '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8ff;border-radius:8px;border:1px solid #e0e0f0;margin-bottom:24px;">'
      . '<tr><td style="padding:20px 24px;">'
      . '<table width="100%" cellpadding="6" cellspacing="0">'
      . '<tr>'
      .   '<td style="color:#8592a3;font-size:13px;width:40%;">Plan renovado</td>'
      .   '<td style="color:#566a7f;font-size:14px;font-weight:600;">' . $plan
      .     ' <span style="display:inline-block;margin-left:8px;padding:2px 10px;border-radius:20px;background:' . $badgeColor . ';color:#fff;font-size:11px;font-weight:700;">' . $badgeLabel . '</span>'
      .   '</td>'
      . '</tr>'
      . '<tr><td style="color:#8592a3;font-size:13px;border-top:1px solid #e0e0f0;padding-top:10px;">Meses renovados</td>'
      .     '<td style="color:#566a7f;font-size:14px;font-weight:600;border-top:1px solid #e0e0f0;padding-top:10px;">' . $meses . ' mes(es)</td></tr>'
      . '<tr><td style="color:#8592a3;font-size:13px;border-top:1px solid #e0e0f0;padding-top:10px;">Precio pagado</td>'
      .     '<td style="color:#71dd37;font-size:14px;font-weight:600;border-top:1px solid #e0e0f0;padding-top:10px;">$' . $precio . '</td></tr>'
      . '<tr><td style="color:#8592a3;font-size:13px;border-top:1px solid #e0e0f0;padding-top:10px;">Nueva fecha inicio</td>'
      .     '<td style="color:#566a7f;font-size:14px;font-weight:600;border-top:1px solid #e0e0f0;padding-top:10px;">' . $fechaInicio . '</td></tr>'
      . '<tr><td style="color:#8592a3;font-size:13px;border-top:1px solid #e0e0f0;padding-top:10px;">Nuevo vencimiento</td>'
      .     '<td style="color:#ff3e1d;font-size:14px;font-weight:600;border-top:1px solid #e0e0f0;padding-top:10px;">' . $fechaFin . '</td></tr>'
      . '</table></td></tr></table>'

      . '<p style="margin:0 0 32px;color:#697a8d;font-size:14px;line-height:1.6;">Consultas: '
      . '<a href="mailto:info@solucionesitec.com" style="color:#696cff;text-decoration:none;">info@solucionesitec.com</a></p>'
      . '</td></tr>'

      // Footer
      . '<tr><td style="background:#f8f8ff;padding:20px 40px;text-align:center;border-top:1px solid #e0e0f0;">'
      . '<p style="margin:0;color:#a1acb8;font-size:12px;">© 2025 SolucionesITEC · '
      . '<a href="https://solucionesitec.com" style="color:#696cff;text-decoration:none;">solucionesitec.com</a></p>'
      . '</td></tr>'

      . '</table></td></tr></table></body></html>';
  }

  private static function templateRenovacionTexto(array $r): string
  {
    $empresa     = $r['nombre_empresa'] ?? '';
    $plan        = $r['nombre_plan']    ?? '';
    $meses       = $r['meses']          ?? '';
    $precio      = number_format((float)($r['precio'] ?? 0), 2);
    $fechaInicio = $r['fecha_inicio']   ?? '';
    $fechaFin    = $r['fecha_fin']      ?? '';

    return "Renovación confirmada — {$empresa}\n\n"
      . "Tu plan ha sido renovado exitosamente.\n\n"
      . "Detalles:\n"
      . "  - Plan:            {$plan}\n"
      . "  - Meses renovados: {$meses}\n"
      . "  - Precio pagado:   \${$precio}\n"
      . "  - Nueva fecha inicio:  {$fechaInicio}\n"
      . "  - Nuevo vencimiento:   {$fechaFin}\n\n"
      . "Soporte: info@solucionesitec.com\n"
      . "Web: https://solucionesitec.com\n\n"
      . "© SolucionesITEC";
  }
}
