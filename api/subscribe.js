export default async function handler(req, res) {

  // Solo POST permitido
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // CORS — solo permite llamadas desde tu dominio
  res.setHeader('Access-Control-Allow-Origin', 'https://bitacoratech.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { email, whatsapp } = req.body;

  // Validación básica
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Correo inválido' });
  }

  // API Key guardada como variable de entorno en Vercel (nunca en el código)
  const BREVO_KEY  = process.env.BREVO_API_KEY;
  const BREVO_LIST = 2; // ID lista "BitácoraTech Leads"

  if (!BREVO_KEY) {
    console.error('BREVO_API_KEY no configurada en variables de entorno');
    return res.status(500).json({ error: 'Configuración incompleta en el servidor' });
  }

  // Construir contacto
  const attributes = {};
  if (whatsapp && whatsapp.trim()) {
    attributes['WHATSAPP'] = whatsapp.trim();
  }

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_KEY
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        attributes,
        listIds: [BREVO_LIST],
        updateEnabled: true
      })
    });

    // 204 = creado, 400 con duplicate_parameter = ya existe → ambos son éxito
    if (brevoRes.status === 204 || brevoRes.ok) {
      return res.status(200).json({ ok: true });
    }

    const data = await brevoRes.json().catch(() => ({}));

    if (brevoRes.status === 400 && data.code === 'duplicate_parameter') {
      // Contacto ya existe — igual desbloqueamos la descarga
      return res.status(200).json({ ok: true, note: 'contacto existente actualizado' });
    }

    console.error('Brevo error:', brevoRes.status, data);
    return res.status(502).json({ error: 'Error al registrar en Brevo', detail: data.message });

  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
