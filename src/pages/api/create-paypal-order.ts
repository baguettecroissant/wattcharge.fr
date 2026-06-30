import type { APIRoute } from 'astro';
import { createPayPalOrder } from '../../lib/paypal';

export const prerender = false;

const PRODUCTS_MAP: Record<string, { price: number }> = {
  'wattcharge-home-7': { price: 389.00 },
  'wattcharge-home-11': { price: 449.00 },
  'wattcharge-pro-22': { price: 489.00 }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const items = body.items || (body.productId ? [{ id: body.productId, quantity: 1 }] : []);
    const promoCode = body.promoCode;

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: 'Panier vide ou invalide.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let subtotal = 0;
    for (const item of items) {
      const productDetails = PRODUCTS_MAP[item.id];
      if (!productDetails) {
        return new Response(JSON.stringify({ error: `Produit ${item.id} inconnu.` }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      subtotal += productDetails.price * item.quantity;
    }

    const discount = promoCode === 'WATT10' ? subtotal * 0.1 : 0;
    const shipping = 30.0;
    const finalTotal = subtotal + shipping - discount;

    const referenceId = items[0].id;

    // Création de la commande auprès de l'API PayPal
    const orderData = await createPayPalOrder(referenceId, finalTotal.toFixed(2));

    return new Response(JSON.stringify({ id: orderData.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Erreur PayPal Create Order:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
