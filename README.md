# KS Chat – LLM Assistant (Next.js + Gemini + Supabase)

KS Chat est une application de chatbot en ligne construite dans le cadre d’un exercice technique.  
Elle permet à un utilisateur authentifié de discuter avec un LLM (Google Gemini), avec :

- **Streaming** des réponses en temps réel
- **Interface moderne** et responsive (type ChatGPT)
- **Sauvegarde** des conversations et des messages dans Supabase
- Affichage d’une **métrique de tokens/s** pendant la génération (bonus demandé)

---

## 🚀 Demo

- **Application déployée** : _à compléter (URL Vercel)_
- **Repository GitHub** : _à compléter (URL du repo)_

---

## ✨ Fonctionnalités principales

- 💬 **Chat avec un LLM (Gemini)**
  - Modèle : `gemini-2.0-flash-001`
  - Route API `/api/chat` en **streaming** (Server-Sent Events)

- 🎨 **Interface UX**
  - UI en **Next.js + React + Tailwind CSS**
  - Layout avec **sidebar de conversations** + zone de chat
  - Avatars utilisateur / assistant
  - Auto-scroll smooth, indicator de streaming (“Assistant is typing…”)
  - Interface mobile-friendly

- 🔐 **Authentification Supabase**
  - Sign up / login par **email + mot de passe**
  - Gestion de session côté client via `@supabase/supabase-js`

- 🗄️ **Base de données Supabase**
  - `profiles` : profil minimal de chaque utilisateur
  - `conversations` : un thread par conversation
  - `messages` : tous les messages (user + assistant) liés à une conversation

- 📊 **Métrique de performance (tokens/s)**
  - Calculée à partir de `usageMetadata` retourné par Gemini (quand disponible)
  - Affichage du `tokens/s` dans l’en-tête pendant / après la génération

---

## ⚠️ Limites de la métrique “tokens/s” en production

La métrique “tokens par seconde” est utile pour **debug** ou comparer des appels techniques, mais elle n’est **pas adaptée comme KPI principal** en production, pour plusieurs raisons :

1. **Elle ne reflète pas la latence perçue par l’utilisateur**
   - L’utilisateur se soucie surtout :
     - du temps avant les premiers tokens (time-to-first-token),
     - du délai avant que la réponse soit vraiment exploitable.
   - On peut avoir un bon tokens/s mais un gros délai initial → UX perçue mauvaise.

2. **Elle mélange plusieurs couches (réseau, backend, LLM)**
   - Une baisse de tokens/s peut venir :
     - d’un réseau lent,
     - d’un server saturé,
     - de la charge côté provider LLM.
   - Impossible d’isoler facilement où est le vrai problème.

3. **Elle dépend du modèle et de la tokenisation**
   - Deux modèles différents peuvent générer un texte similaire avec un nombre de tokens différent.
   - Difficilement comparable entre providers et versions de modèles.

4. **Elle ne mesure ni le coût ni la qualité**
   - Un modèle très rapide mais peu pertinent est inutile.
   - On ne mesure ni le coût par requête, ni la satisfaction utilisateur.

👉 En production, on préférerait suivre :
- **Latence p95/p99**
- **Taux d’erreurs**
- **Satisfaction utilisateur / qualité des réponses**
- **Coût moyen par requête**

---

## 🛠️ Stack technique

- **Framework** : Next.js 16 (App Router)
- **Langage** : TypeScript
- **UI** : React + Tailwind CSS
- **Auth & DB** : Supabase (Auth + Postgres)
- **LLM** : Google Gemini via `@google/genai`
- **Déploiement** : Vercel (Next.js) + Supabase cloud

---

## 🗃️ Modèle de données (Supabase)

### `profiles`

- `id` (UUID, PK) – identique à `auth.users.id`
- `created_at` (timestamp)
- (Facilement extensible : `display_name`, `avatar_url`, etc.)

### `conversations`

- `id` (UUID, PK)
- `user_id` (UUID, FK → `profiles.id`)
- `title` (texte court, dérivé du premier message user)
- `created_at` (timestamp)

### `messages`

- `id` (UUID, PK)
- `conversation_id` (UUID, FK → `conversations.id`)
- `user_id` (UUID, FK → `profiles.id`)
- `role` (`user` | `assistant`)
- `content` (texte complet du message)
- `created_at` (timestamp)

---

## 📂 Structure du projet (simplifiée)

```bash
ks-chat/
├─ app/
│  ├─ page.tsx              # Page d’accueil (auth / redirection)
│  ├─ chat/page.tsx         # Interface principale de chat
│  └─ api/chat/route.ts     # API streaming (Gemini + Supabase)
├─ components/
│  ├─ AuthForm.tsx          # Formulaire login / register
│  ├─ MessageBubble.tsx     # Affichage d’une bulle de message
│  ├─ StreamingIndicator.tsx# Animation "typing"
│  └─ SidebarConversations.tsx # Liste des conversations
├─ lib/
│  ├─ supabaseClient.ts     # Client Supabase côté browser
│  └─ supabaseServer.ts     # Client Supabase côté serveur
├─ styles/
│  └─ globals.css
├─ README.md
└─ Architecture.md
