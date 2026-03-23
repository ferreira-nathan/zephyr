# Zephyr — Messagerie E2EE

Une messagerie sécurisée de bout en bout (E2EE), légère, minimaliste et 100% gratuite (Serverless PWA) utilisant Vite, React, Zustand et Supabase.

Ce dépôt contient l'état d'avancement du projet. 

## État de développement (Task List)

### Phase 1 — Setup
- [x] Scaffold Vite + React project
- [x] Install dependencies (supabase-js, libsodium, zustand, react-router, framer-motion, vite-plugin-pwa, qrcode.react, html5-qrcode)
- [x] Configure vite.config.js avec PWA plugin
- [x] Setup Supabase client (src/lib/supabase.js)
- [x] Setup crypto layer E2EE (src/lib/crypto.js)
- [x] Base routing + layout (pages Home, Chat, Contacts, Calendar, Settings)
- [x] Design system CSS (variables, dark mode, typo Inter)

### Phase 2 — Auth + Profil + Keypair
- [x] Page inscription/connexion (email + mot de passe)
- [x] Génération keypair E2EE au premier lancement + stockage localStorage
- [x] Page profil (nom, avatar)
- [x] Auth store (Zustand)

### Phase 3 — QR Code Contact
- [x] Page QR Code : afficher son propre QR (pubKey + userId) et copier le code
- [x] Scanner QR d'un ami ou coller son code → créer conversation + stocker contact
- [x] Liste contacts

### Phase 4 — Chat E2EE Temps Réel
- [x] Créer conversation 1:1 depuis contact
- [x] Envoi message texte chiffré
- [x] Réception temps réel (Supabase Realtime)
- [x] Déchiffrement à la réception
- [x] UI bulles de messages

### Phase 5 — UI Complète
- [x] Design system complet (animations Framer Motion)
- [x] Swipe to reply (mobile, touch events)
- [x] Réactions emoji (long press → picker)
- [x] Status messages (envoyé, lu)

### Phase 6 — Média + Vocal
- [x] Upload images haute def (Supabase Storage)
- [x] Viewer images (onclick)
- [x] Enregistrement vocal 1 tap (MediaRecorder API)
- [x] Lecture inline de l'audio
- [x] Auto-delete (timer 24h par message)

### Phase 7 — Groupes
- [x] Création groupe depuis contacts existants
- [x] Chiffrement de groupe (clé symétrique distribuée)
- [x] Gestion membres (admin/membre)

### Phase 8 — Calendrier + Sondages
- [x] Vue calendrier par conversation (historique E2EE)
- [x] Création événements (messages E2EE)
- [x] Création sondages dans le composer
- [x] Vote temps réel (E2EE Reactions)

### Phase 9 — Notifications + Finition
- [x] Web Push API (Service Worker personnalisé)
- [x] Notifications messages reçus en background
- [x] PWA manifest + icônes générées
- [x] Polish UI final (Style Instagram/Zephyr)

## 🚀 Guide détaillé : Activation des Notifications Push

Pour que les notifications fonctionnent quand l'application est fermée (en arrière-plan), vous devez déployer une "Edge Function" sur votre projet Supabase. Voici la marche à suivre pas à pas :

### 1. Pré-requis : Utiliser la CLI Supabase
Plus besoin d'installer quoi que ce soit globalement. On va utiliser `npx` qui permet d'exécuter la CLI directement.

Connectez-vous et liez votre projet (depuis votre terminal) :
```bash
# ⚠️ TRÈS IMPORTANT : allez d'abord dans le dossier du projet
cd Documents\Autre\Messagerie

npx supabase login
npx supabase link --project-ref epphxuqucguwivgxpnut
```

### 2. Configurer les Secrets (Clés VAPID)
Les clés VAPID permettent d'identifier votre serveur auprès des services de push (Google, Apple, etc.). Exécutez ces deux commandes dans votre terminal :
```bash
npx supabase secrets set VAPID_PUBLIC_KEY=BNKETw7DrI3j3B2CsgTVG0SEnencIokZCvYP8ju5DQ6Bv9vNqEKbHvj89zkzdxJGS5va2wIw8qiLjEBGV56TjmY
npx supabase secrets set VAPID_PRIVATE_KEY=5sLGbaiBUf8qpExNWSPg36g2AUNLqP0DGkJTklqXXmg
```

### 3. Déployer la fonction "send-push"
Utilisez la commande suivante pour envoyer le code de la fonction sur les serveurs de Supabase :
```bash
npx supabase functions deploy send-push
```

### 4. Activer le Webhook (Automatisme)
Maintenant, il faut dire à Supabase d'appeler cette fonction à chaque nouveau message :
1. Allez sur votre **Dashboard Supabase**.
2. Allez dans **Database** -> **Webhooks**.
3. Cliquez sur **Enable Webhooks** si ce n'est pas déjà fait.
4. Cliquez sur **Create a new Hook** :
   - **Name** : `send-push-on-message`
   - **Schema** : `public`
   - **Table** : `messages`
   - **Events** : Cochez uniquement `Insert`.
   - **Type of hook** : `HTTP Request`
   - **HTTP Method** : `POST`
   - **URL** : `https://epphxuqucguwivgxpnut.supabase.co/functions/v1/send-push`
   - **HTTP Headers** : Cliquez sur "Add new header" :
     - Key : `Content-Type`, Value : `application/json`
     - Key : `Authorization`, Value : `Bearer VOTRE_ANON_KEY` (utilisez la même clé que dans votre fichier .env)
5. Enregistrez.

**C'est terminé !** Allez dans les **Réglages** de l'app Zephyr et activez les notifications. Faites un test en envoyant un message depuis un autre compte/navigateur !

---

## 🚀 Déploiement sur Vercel (Gratuit)

Pour mettre votre application en ligne et accessible de partout :

### 1. Mettre le code sur GitHub
Créez un dépôt sur GitHub et poussez votre code :
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/VOTRE_NOM/zephyr.git
git push -u origin main
```

### 2. Connecter à Vercel
1. Allez sur [Vercel](https://vercel.com/) et connectez-vous avec GitHub.
2. Cliquez sur **Add New** -> **Project**.
3. Importez votre dépôt `zephyr`.

### 3. Configurer les Variables d'Environnement (CRUCIAL)
Avant de cliquer sur **Deploy**, allez dans la section **Environment Variables** et ajoutez les deux clés suivantes :
- `VITE_SUPABASE_URL` : (votre URL Supabase)
- `VITE_SUPABASE_ANON_KEY` : (votre clé anon public)

### 4. Déployer
Cliquez sur **Deploy**. Vercel va détecter automatiquement que c'est un projet Vite et va générer votre PWA. 

Une fois terminé, vous aurez une URL du type `https://zephyr.vercel.app`. Ouvrez-la sur votre téléphone, et utilisez l'option "Ajouter à l'écran d'accueil" pour l'installer comme une vraie application !
