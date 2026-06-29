-- Création de la table des produits (pour les formules de la borne)
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  compare_at_price DECIMAL(10, 2),
  cost_price DECIMAL(10, 2), -- Coût d'achat AliExpress
  features TEXT[],
  power_output TEXT, -- ex: '7.4 kW', '11 kW', '22 kW'
  phase TEXT, -- ex: 'Monophasé', 'Triphasé'
  current_rating TEXT, -- ex: '32A', '16A'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Création de la table des commandes
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  paypal_order_id TEXT UNIQUE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  shipping_address JSONB,
  product_id TEXT REFERENCES products(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  install_addon BOOLEAN DEFAULT FALSE, -- Indique si le client a pris l'option installation IRVE
  install_amount DECIMAL(10, 2) DEFAULT 0.00, -- Montant facturé pour l'installation (+450 €)
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'shipped', 'cancelled'
  installation_details JSONB, -- Pour stocker les détails techniques qualifiant la pose IRVE
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertion des 3 variantes de bornes Feyree (Smart App Version Tuya)
INSERT INTO products (id, name, description, price, compare_at_price, cost_price, power_output, phase, current_rating, features)
VALUES 
  ('wattcharge-home-7', 'WattCharge Home 7.4', 'Borne de recharge intelligente monophasée 7.4kW idéale pour une installation domestique standard. Contrôle connecté via application mobile Tuya Smart Life et protection Type B intégrée.', 389.00, 599.00, 216.99, '7.4 kW', 'Monophasé', '32A', ARRAY['Puissance réglable jusqu''à 7.4kW', 'Raccordement Monophasé 230V', 'Application Tuya Smart Life WiFi', 'Protection RCD DC 6mA + AC 30mA intégrée', 'Câble Type 2 de 5 mètres inclus', 'Étanchéité certifiée IP66']),
  ('wattcharge-home-11', 'WattCharge Home 11', 'Borne de recharge connectée 11kW triphasée, conçue pour les habitations équipées en triphasé. Permet une recharge accélérée et sécurisée pour tous les véhicules compatibles triphasés 11kW.', 449.00, 699.00, 254.69, '11 kW', 'Triphasé', '16A', ARRAY['Puissance réglable jusqu''à 11kW', 'Raccordement Triphasé 400V', 'Application Tuya Smart Life WiFi', 'Protection RCD DC 6mA + AC 30mA intégrée', 'Câble Type 2 de 5 mètres inclus', 'Étanchéité certifiée IP66']),
  ('wattcharge-pro-22', 'WattCharge Pro 22', 'Le modèle de borne le plus puissant de notre catalogue. Offre jusqu''à 22kW de puissance en triphasé pour une charge ultra-rapide à domicile ou en entreprise. Livré complet avec câble 5m.', 489.00, 799.00, 260.99, '22 kW', 'Triphasé', '32A', ARRAY['Puissance réglable jusqu''à 22kW', 'Raccordement Triphasé 400V', 'Application Tuya Smart Life WiFi', 'Protection RCD DC 6mA + AC 30mA intégrée', 'Câble Type 2 de 5 mètres inclus', 'Étanchéité certifiée IP66'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  cost_price = EXCLUDED.cost_price,
  power_output = EXCLUDED.power_output,
  phase = EXCLUDED.phase,
  current_rating = EXCLUDED.current_rating,
  features = EXCLUDED.features;
