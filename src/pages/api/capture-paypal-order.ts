import type { APIRoute } from 'astro';
import { capturePayPalOrder } from '../../lib/paypal';
import { processSuccessfulOrder } from '../../lib/orders';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { orderID, formulaId } = await request.json();

    if (!orderID || !formulaId) {
      return new Response(JSON.stringify({ error: 'orderID et formulaId sont requis.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Capture de la commande auprès de l'API PayPal
    const captureResult = await capturePayPalOrder(orderID);

    if (captureResult.status !== 'COMPLETED') {
      return new Response(JSON.stringify({ error: 'La commande n\'est pas au statut COMPLETED.', details: captureResult }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extraction des détails PayPal
    const payer = captureResult.payer || {};
    const purchaseUnit = captureResult.purchase_units?.[0] || {};
    const shipping = purchaseUnit.shipping || {};
    const address = shipping.address || {};
    
    // Formatage de l'adresse de livraison
    const formattedAddress = {
      line1: address.address_line_1 || '',
      line2: address.address_line_2 || '',
      city: address.admin_area_2 || '',
      postal_code: address.postal_code || '',
      country: address.country_code || '',
    };

    const customerName = payer.name 
      ? `${payer.name.given_name || ''} ${payer.name.surname || ''}`.trim()
      : (shipping.name?.full_name || 'Client PayPal');

    const customerEmail = payer.email_address || 'client-paypal@placeholder.com';
    
    const capturePayment = purchaseUnit.payments?.captures?.[0] || {};
    const totalAmount = parseFloat(capturePayment.amount?.value || '0.00');

    // Enregistrement et notifications via notre service centralisé
    const result = await processSuccessfulOrder({
      email: customerEmail,
      name: customerName,
      shippingAddress: formattedAddress,
      productId: formulaId,
      totalAmount: totalAmount,
      paymentId: orderID,
      gateway: 'paypal',
    });

    return new Response(JSON.stringify({ 
      status: 'COMPLETED', 
      orderId: result.orderId 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Erreur PayPal Capture API:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
