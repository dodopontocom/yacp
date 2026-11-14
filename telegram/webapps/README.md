# Tetra-Zen — Telegram Mini App

Jogo de blocos com física 2D para o Telegram Mini App do YACP. A versão anterior,
com as ADAs e os emojis animados, continua disponível no histórico do Git
(commit `0bf8084`).

## Estrutura

```text
webapps/
├── index.html
├── style.css
├── js/
│   ├── app.js              # loader com cache-busting e recuperação de shell antigo
│   ├── tetris-app.js       # bootstrap, HUD, Telegram e ciclo de vida
│   ├── telegram-bridge.js  # wrapper defensivo do SDK do Telegram
│   └── tetris/
│       ├── world.js        # mundo Matter.js, input, spawn e regras
│       ├── pieces.js       # tetraminós e metadados dos blocos
│       ├── renderer.js     # desenho do fundo, peças e efeitos
│       ├── effects.js      # partículas e ondas de impacto
│       ├── pileAnalysis.js # detecção de faixas para dissolver
│       ├── marimba.js      # síntese de áudio via Web Audio
│       ├── tilt.js         # acelerômetro do Telegram / DeviceOrientation
│       ├── tuning.js       # constantes de gameplay
│       └── matter.js       # resolução preguiçosa do Matter.js
├── vendor/
│   └── matter-0.20.0.min.js
└── image/
    └── tetra.svg
```

## Desenvolvimento local

O app usa módulos ES, então precisa ser servido por HTTP:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080/telegram/webapps/`.

Para testar dentro do Telegram, publique a branch ou use um túnel HTTPS
(`cloudflared`, `ngrok`, etc.) e aponte o Mini App para a URL gerada.

### Cache do WebView

O GitHub Pages serve o HTML com `cache-control: max-age=600`, e o WebView do
Telegram pode manter o HTML antigo por mais tempo que os assets. Se uma versão
antiga aparecer no Telegram, abra a URL com um cache-buster:

```text
https://dodopontocom.github.io/yacp/telegram/webapps/?v=20261114-3
```

O `js/app.js` também detecta um shell antigo (sem `#game`), compara
`version.json` e recarrega com `?v=` automaticamente quando o loader novo chega
a ser executado. Ao publicar uma mudança grande, atualize `CACHE_VERSION` em
`js/app.js`, `version.json`, as query strings de `index.html` e os imports
versionados em `js/tetris-app.js`/`js/tetris/`.

## Controles

- Arraste uma peça para movê-la.
- Toque em uma peça para girá-la.
- Deslize para baixo em uma área vazia para soltar a próxima peça.
- `Gravidade` inclina o campo para os lados.
- `Zero-G` reduz a gravidade por alguns segundos.
- `Reiniciar` limpa a pilha.
- `Soltar` (ou o MainButton do Telegram) adiciona uma peça imediatamente.

No modo **Zen**, a pilha se dissolve quando fica densa demais. No modo
**Score Attack**, a rodada termina quando a pilha alcança o topo.

## Comportamento no Telegram

- `ready()` e `expand()` são chamados depois do primeiro paint.
- O tema do jogo é sempre escuro; header, background e bottom bar do Telegram
  são fixados em `#0f1115` para não conflitar com o canvas.
- O MainButton nativo é usado como “Soltar peça” e vira “Jogar de novo” ao fim
  da rodada. No navegador, o botão equivalente fica na barra inferior.
- `disableVerticalSwipes()` é chamado ao tocar no campo e durante o arrasto,
  para que o gesto de soltar peça não minimize o Mini App.
- O acelerômetro do Telegram (Bot API 8.0+) controla a gravidade lateral no
  celular. Se não estiver disponível, o app tenta `DeviceOrientationEvent`.
- Haptics são usados em drop, reset, troca de modo, dissolução e fim de rodada.
- A simulação pausa em `deactivated`/`visibilitychange` e retoma ao voltar.

## Áudio

As notas de marimba são sintetizadas em tempo real com a Web Audio API; não há
arquivos de áudio. O contexto é criado/retomado no primeiro gesto do usuário e
pode ser silenciado pelo botão de som.

## Créditos

A ideia e a implementação original do Tetra-Zen estão no projeto irmão
`tetris-zen`. Esta versão foi portada para o shell sem build do Mini App, com
integração ao SDK do Telegram e layout próprio.

- Ícones: [Lucide](https://lucide.dev) (ISC).
- Física: [Matter.js](https://brm.io/matter-js/) (MIT).
