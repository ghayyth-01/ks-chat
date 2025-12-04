# Architecture – KS Chat (LLM Assistant)

Ce document décrit l’architecture de l’application **KS Chat**, un chatbot basé sur **Next.js**, **Supabase** et **Google Gemini**.  
On la présente sous deux angles :

- **Architecture logique** : couches, responsabilités, flux de données.
- **Architecture physique** : services déployés, communications réseau.

---

## 1. Objectifs d’architecture

- Fournir une **interface de chat moderne** avec streaming LLM.
- Garantir une **authentification sécurisée** et centralisée (Supabase Auth).
- Persister les **conversations** et **messages** en base de données.
- Être **simple, lisible et extensible** pour un test technique.
- Exposer une **métrique de performance** (tokens/s) en bonus.

---

## 2. Architecture logique

### 2.1. Vue globale

```text
[ UI React (Next.js) ]
        |
        | HTTP (fetch) + SSE
        v
[ API Next.js /api/chat ]
        |
   +----+--------------------------+
   |                               |
[ Supabase (Auth + DB) ]        [ Google Gemini (LLM) ]
