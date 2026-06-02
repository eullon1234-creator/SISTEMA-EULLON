# Central de Apps Eullon 🚀

Centralizador de todos os aplicativos Eullon. Hospedado no GitHub Pages.

## Como adicionar um app

1. Edite o arquivo [`apps.json`](apps.json)
2. Adicione um novo objeto no array `apps`:

```json
{
  "id": "meu-app",
  "name": "Meu App",
  "description": "Descrição do app",
  "url": "https://meu-app.vercel.app",
  "icon": "🌟",
  "category": "Ferramentas",
  "release_tag": ""
}
```

3. Commit e push para `main` — o GitHub Pages atualiza automaticamente.

## Releases

Para cada app que tiver arquivos (binários, instaladores, etc.):
1. Crie um [GitHub Release](https://github.com/eullon1234-creator/SISTEMA-EULLON/releases)
2. Coloque o nome da tag no campo `release_tag` do app em `apps.json`
3. O card do app vai mostrar um botão "⬇ Release" linkando direto para o release
