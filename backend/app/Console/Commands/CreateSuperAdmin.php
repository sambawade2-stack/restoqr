<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class CreateSuperAdmin extends Command
{
    protected $signature = 'admin:create-super
                            {--name= : Nom complet}
                            {--email= : Adresse email}
                            {--password= : Mot de passe}';

    protected $description = 'Créer ou mettre à jour le compte Super Admin de la plateforme';

    public function handle(): int
    {
        $name     = $this->option('name')     ?? $this->ask('Nom complet');
        $email    = $this->option('email')    ?? $this->ask('Email');
        $password = $this->option('password') ?? $this->secret('Mot de passe (min. 8 caractères)');

        $validator = Validator::make(
            ['name' => $name, 'email' => $email, 'password' => $password],
            [
                'name'     => ['required', 'string', 'max:100'],
                'email'    => ['required', 'email'],
                'password' => ['required', 'min:8'],
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }
            return self::FAILURE;
        }

        $exists = User::where('email', $email)->exists();

        User::updateOrCreate(
            ['email' => $email],
            [
                'name'          => $name,
                'password'      => Hash::make($password),
                'role'          => 'super_admin',
                'restaurant_id' => null,
                'is_active'     => true,
            ]
        );

        $action = $exists ? 'mis à jour' : 'créé';
        $this->info("✅ Super Admin {$action} avec succès.");
        $this->table(['Champ', 'Valeur'], [
            ['Nom',   $name],
            ['Email', $email],
            ['Rôle',  'super_admin'],
        ]);

        return self::SUCCESS;
    }
}
