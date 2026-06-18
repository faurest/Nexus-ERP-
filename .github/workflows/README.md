# Automatisation Android (AAB) pour le Play Store

Le pipeline `build-android.yml` génèrera automatiquement le fichier `.aab` (Android App Bundle).

## Instructions pour la Production
Actuellement, le workflow génère temporairement un keystore de test pour vous permettre d'avoir un `.aab` fonctionnel immédiatement. Pour une mise en production sur le Google Play Store :

1. Générez votre propre keystore en local :
   `keytool -genkey -v -keystore release.keystore -alias votre_alias -keyalg RSA -keysize 2048 -validity 10000`
2. Encodez-le en base64 :
   `base64 release.keystore > keystore.txt`
3. Ajoutez le contenu de `keystore.txt` dans la console GitHub (Settings > Secrets and variables > Actions) sous le nom `KEYSTORE_BASE64`.
4. Ajoutez vos mots de passe dans les Secrets GitHub (`KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD`).

Ces clés sont fondamentales pour valider les futures mises à jour de Nexus ERP sur le Play Store de Google.
