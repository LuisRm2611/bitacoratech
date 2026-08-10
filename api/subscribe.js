module.exports = async function handler(req, res) {

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email, whatsapp } = req.body || {};

  // Validación
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Correo inválido' });
  }

  const BREVO_KEY  = process.env.BREVO_API_KEY;
  const BREVO_LIST = 2;

  if (!BREVO_KEY) {
    console.error('BREVO_API_KEY no configurada');
    return res.status(500).json({ error: 'Configuración incompleta' });
  }

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

    const text = await brevoRes.text();
    let data = {};
    try { data = JSON.parse(text); } catch(e) {}

    if (brevoRes.status === 201 || brevoRes.status === 204 || brevoRes.ok) {
      return res.status(200).json({ ok: true });
    }

    if (brevoRes.status === 400 && data.code === 'duplicate_parameter') {
      return res.status(200).json({ ok: true, note: 'contacto existente' });
    }

    console.error('Brevo error:', brevoRes.status, data);
    return res.status(502).json({ error: 'Error Brevo', detail: data.message || text });

  } catch (err) {
    console.error('Error interno:', err.message);
    return res.status(500).json({ error: 'Error interno', detail: err.message });
  }
};
