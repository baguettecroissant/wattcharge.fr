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
    const { productId } = await request.json();

    if (!productId || !PRODUCTS_MAP[productId]) {
      return new Response(JSON.stringify({ error: 'Produit invalide ou manquant.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const finalPrice = PRODUCTS_MAP[productId].price;

    // Création de la commande auprès de l'API PayPal
    const orderData = await createPayPalOrder(productId, finalPrice.toFixed(2));

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
