# Guía de Deploy

## Deploy Manual

Cuando hagas cambios y quieras desplegarlos a producción:

```bash
# 1. Hacer commit de tus cambios
git add .
git commit -m "Tu mensaje de commit"
git push

# 2. Deploy a Vercel
npm run deploy
```

O directamente:

```bash
npx vercel --prod --yes
```

## Verificar Deploy

Después del deploy, verifica en:
- **URL de producción:** https://lendcore.vercel.app
- **Dashboard de Vercel:** https://vercel.com/pdcisneros1s-projects/lendcore

## Nota sobre Auto-Deploy

El auto-deploy desde GitHub puede fallar ocasionalmente. Si después de hacer `git push` no ves un nuevo deployment en Vercel, ejecuta manualmente `npm run deploy`.
