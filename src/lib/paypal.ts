const PAYPAL_CLIENT_ID = import.meta.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = import.meta.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_API_URL = import.meta.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

/**
 * Génère un jeton d'accès OAuth2 auprès de l'API PayPal.
 */
export async function getPayPalAccessToken(): Promise<string> {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal client ID or client secret is not configured.');
  }

  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate PayPal access token: ${errorText}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

/**
 * Crée une commande PayPal côté serveur.
 */
export async function createPayPalOrder(productId: string, amountValue: string): Promise<any> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: productId,
          amount: {
            currency_code: 'EUR',
            value: amountValue,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create PayPal order: ${errorText}`);
  }

  return await response.json();
}

/**
 * Capture le paiement d'une commande PayPal approuvée.
 */
export async function capturePayPalOrder(orderId: string): Promise<any> {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to capture PayPal order: ${errorText}`);
  }

  return await response.json();
}
