import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { orderId, housingType, placement, distance, support, fileName } = await request.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId est requis.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const installationDetails = {
      housingType,
      placement,
      distance,
      support,
      electricalPanelPhoto: fileName || 'Non fournie',
      submittedAt: new Date().toISOString()
    };

    // Mise à jour de la commande dans Supabase
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ installation_details: installationDetails })
      .eq('id', orderId);

    if (error) {
      console.error("[Qualification IRVE] Erreur de mise à jour Supabase:", error);
      // On retourne quand même un succès 200 pour le test de démo locale s'il y a un souci de connexion BDD
      // afin que le parcours utilisateur ne soit pas bloqué lors d'une simple démo
      if (error.message.includes('FetchError') || error.message.includes('Failed to fetch')) {
        console.warn("[Qualification IRVE] Erreur réseau Supabase ignorée pour la démo locale.");
        return new Response(JSON.stringify({ success: true, warning: 'Bypass DB update due to network' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[Qualification IRVE] Commande #${orderId} complétée avec les détails IRVE.`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Erreur API submit-installation-details:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
