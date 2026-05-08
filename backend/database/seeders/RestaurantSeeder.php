<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Restaurant;
use App\Models\Subscription;
use App\Models\Table;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class RestaurantSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Super Admin (propriétaire de la plateforme)
        User::updateOrCreate(['email' => 'sambawade2@gmail.com'], [
            'name'          => 'Samba Wade',
            'password'      => Hash::make('Gm@2026'),
            'role'          => 'super_admin',
            'restaurant_id' => null,
            'is_active'     => true,
        ]);

        // 2. Demo Restaurant
        $restaurant = Restaurant::updateOrCreate(['slug' => 'chez-mamie'], [
            'name'     => 'Chez Mamie',
            'email'    => 'contact@chezmamie.sn',
            'phone'    => '+221 77 123 45 67',
            'address'  => '12 Rue des Fleurs, Dakar',
            'currency' => 'FCFA',
            'timezone' => 'Africa/Dakar',
            'is_active'=> true,
            'settings' => ['shift_start_hour' => 3],
        ]);

        // 2b. Subscription démo — actif permanent (pas d'expiration)
        Subscription::updateOrCreate(
            ['restaurant_id' => $restaurant->id],
            [
                'plan'       => 'standard',
                'status'     => 'active',
                'amount'     => 0,
                'starts_at'  => now(),
                'expires_at' => null,
            ]
        );

        // 3. Users
        User::updateOrCreate(['email' => 'admin@chezmamie.sn'], [
            'restaurant_id' => $restaurant->id,
            'name'          => 'Mamie Diallo',
            'password'      => Hash::make('password'),
            'role'          => 'admin',
            'is_active'     => true,
        ]);

        User::updateOrCreate(['email' => 'caisse@chezmamie.sn'], [
            'restaurant_id' => $restaurant->id,
            'name'          => 'Adja Ndao',
            'password'      => Hash::make('password'),
            'role'          => 'cashier',
            'is_active'     => true,
        ]);

        User::updateOrCreate(['email' => 'cuisine@chezmamie.sn'], [
            'restaurant_id' => $restaurant->id,
            'name'          => 'Moussa Sow',
            'password'      => Hash::make('password'),
            'role'          => 'kitchen',
            'is_active'     => true,
        ]);


        // 4. Tables (12 tables)
        for ($i = 1; $i <= 12; $i++) {
            Table::updateOrCreate(
                ['restaurant_id' => $restaurant->id, 'number' => $i],
                [
                    'name'     => "Table {$i}",
                    'capacity' => ($i <= 6) ? 4 : 6,
                    'status'   => 'available',
                ]
            );
        }

        // 5. Categories & Products
        $entrées = Category::updateOrCreate(
            ['restaurant_id' => $restaurant->id, 'name' => 'Entrées'],
            ['sort_order' => 1, 'is_active' => true]
        );

        $plats = Category::updateOrCreate(
            ['restaurant_id' => $restaurant->id, 'name' => 'Plats'],
            ['sort_order' => 2, 'is_active' => true]
        );

        $desserts = Category::updateOrCreate(
            ['restaurant_id' => $restaurant->id, 'name' => 'Desserts'],
            ['sort_order' => 3, 'is_active' => true]
        );

        $boissons = Category::updateOrCreate(
            ['restaurant_id' => $restaurant->id, 'name' => 'Boissons'],
            ['sort_order' => 4, 'is_active' => true]
        );

        $products = [
            [$entrées->id, 'Salade César',       'Salade fraîche avec sauce César maison',  4500, 1],
            [$entrées->id, 'Soupe du Jour',       'Soupe maison selon arrivage du marché',   2500, 2],
            [$entrées->id, 'Accras de Crevettes', 'Beignets croustillants aux crevettes',    3500, 3],

            [$plats->id,   'Burger Maison',       'Burger fait maison avec frites',          7500, 1],
            [$plats->id,   'Pizza Margherita',    'Tomate, mozzarella, basilic frais',       8000, 2],
            [$plats->id,   'Pizza Royale',        'Jambon, champignons, olives',             9500, 3],
            [$plats->id,   'Steak Frites',        'Entrecôte grillée 200g avec frites',     12000, 4],
            [$plats->id,   'Poulet Yassa',        'Poulet mariné à l\'oignon et citron',     7000, 5],
            [$plats->id,   'Thiéboudienne',       'Riz au poisson, spécialité sénégalaise',  6500, 6],

            [$desserts->id,'Tiramisu',            'Tiramisu artisanal au café',              3500, 1],
            [$desserts->id,'Mousse au Chocolat',  'Mousse légère au chocolat noir',          3000, 2],
            [$desserts->id,'Salade de Fruits',    'Fruits frais de saison',                  2500, 3],

            [$boissons->id,'Eau Minérale',        'Bouteille 50cl',                           500, 1],
            [$boissons->id,'Jus de Bissap',       'Jus d\'hibiscus maison',                  1500, 2],
            [$boissons->id,'Coca-Cola',           'Canette 33cl',                            1000, 3],
        ];

        foreach ($products as [$catId, $name, $desc, $price, $order]) {
            Product::updateOrCreate(
                ['restaurant_id' => $restaurant->id, 'name' => $name],
                [
                    'category_id'  => $catId,
                    'description'  => $desc,
                    'price'        => $price,
                    'is_available' => true,
                    'is_featured'  => in_array($name, ['Burger Maison', 'Pizza Royale', 'Thiéboudienne']),
                    'sort_order'   => $order,
                ]
            );
        }

        $this->command->info('✅ Demo restaurant "Chez Mamie" seeded successfully!');
        $this->command->table(
            ['Role', 'Email', 'Password'],
            [
                ['Super Admin', 'sambawade2@gmail.com',  'Gm@2026'],
                ['Admin',      'admin@chezmamie.sn',   'password'],
                ['Caissier',   'caisse@chezmamie.sn',  'password'],
                ['Cuisine',    'cuisine@chezmamie.sn', 'password'],
            ]
        );
    }
}
