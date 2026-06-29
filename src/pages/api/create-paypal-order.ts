import type { APIRoute } from 'astro';
import { createPayPalOrder } from '../../lib/paypal';
import { supabase } from '../../lib/supabase';

export const prerender = false;

const PRODUCTS_MAP: Record<string, { price: number }> = {
  'wattcharge-home-7': { price: 389.00 },
  'wattcharge-home-11': { price: 449.00 },
  'wattcharge-pro-22': { price: 489.00 }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { productId, installAddon } = await request.json();

    if (!productId || !PRODUCTS_MAP[productId]) {
      return new Response(JSON.stringify({ error: 'Produit invalide ou manquant.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Récupérer le prix en BDD si possible
    let basePrice = PRODUCTS_MAP[productId].price;
    try {
      const { data } = await supabase.from('products').select('price').eq('id', productId).single();
      if (data) {
        basePrice = Number(data.price);
      }
    } catch (e) {
      console.warn("Échec de récupération du prix PayPal en BDD, utilisation du prix local.");
    }

    // Calcul du montant total final
    let finalPrice = basePrice;
    if (installAddon === true) {
      finalPrice += 450.00;
    }

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
