# YACP — Telegram Mini App (física)

Mini App experimental de física 2D com as ADAs do YACP, usando Matter.js e o
SDK atual do Telegram Mini Apps.

## Estrutura

```text
webapps/
├── index.html
├── style.css
├── js/
│   ├── app.js          # bootstrap, tema, viewport, MainButton e controles
│   ├── telegram.js     # wrapper defensivo do SDK do Telegram
│   ├── emoji.js        # camada DOM dos emojis animados (TGS/Lottie)
│   └── physics.js      # cena Matter.js e ciclo de vida
├── vendor/
│   ├── lottie-5.13.0.min.js
│   ├── matter-0.20.0.min.js
│   └── pako-2.1.0.min.js
└── image/
    ├── ada-160.png     # textura otimizada para os corpos
    └── emoji/          # animações .tgs e atribuição
```

## Desenvolvimento local

O app usa módulos ES, então precisa ser servido por HTTP:

```bash
python3 -m http.server 8080
```

Abra `http://localhost:8080/telegram/webapps/`.

Para testar dentro do Telegram, publique a branch ou use um túnel HTTPS
(`cloudflared`, `ngrok`, etc.) e aponte o Mini App para a URL gerada.

## Comportamento

- `ready()` e `expand()` são chamados depois do primeiro paint.
- O tema acompanha `themeChanged` e as variáveis `--tg-theme-*`.
- `viewportChanged`, `safeAreaChanged` e `ResizeObserver` mantêm o canvas
  responsivo.
- O `MainButton` nativo é usado quando disponível; o botão HTML fica como
  fallback para navegador.
- Haptics são usados apenas em ações pontuais.
- Durante o arrasto, `disableVerticalSwipes()` evita que o gesto vertical
  minimize o Mini App; os swipes são reativados ao soltar o corpo.
- O acelerômetro (Bot API 8.0+) é opcional, ativado pelo botão “Inclinar” e
  desligado quando o app é minimizado. Os valores são lidos de
  `Telegram.WebApp.Accelerometer` no evento `accelerometerChanged`, porque o
  SDK não envia os eixos como argumento.
- Dentro do Telegram, parte das formas geométricas é substituída por emojis
  animados (💎, 🔥, ⚡, 🐳, 👑 e 🎉). As animações `.tgs` são descomprimidas
  com `pako` e renderizadas em canvas pelo `lottie-web`; o corpo do Matter.js
  continua cuidando da colisão e o círculo colorido permanece como fallback
  caso o asset não carregue.
- Fora do Telegram o app mantém apenas as formas geométricas. O overlay e os
  assets de emoji nem são criados nesse caso.
- Os emojis pausam e retomam junto com a simulação e são destruídos no
  “Reiniciar”, sem deixar canvases ou animações antigas ativas.
- O canvas limita o pixel ratio a 2 e ativa sleeping no Matter.js.
- `sendData()` não é usado pela simulação. Ele só funciona em Mini Apps abertas
  por keyboard button e fecha o app após o envio.

## Matter.js

A versão vendorizada é a 0.20.0. `pathseg.js` foi removido porque o app não usa
`Matter.Svg`. A cena é recriada de forma idempotente a cada “Reiniciar”, sem
deixar runners ou canvas antigos ativos.

## Emojis animados

As animações são TGS (Lottie comprimido com gzip), o mesmo formato usado pelos
emojis animados do Telegram. A marcação `<tg-emoji>` do Bot API é interpretada
nas mensagens do Telegram, não no HTML do Mini App; por isso as animações são
renderizadas localmente. O `pako` descomprime o arquivo e o `lottie-web` desenha
a animação em um canvas posicionado sobre o corpo físico. A camada usa
`pointer-events: none`, então arrastar e inclinar continuam funcionando.

As animações foram obtidas de
[`ilyhalight/telegram-emoji-effects`](https://github.com/ilyhalight/telegram-emoji-effects)
e são criadas pelo Telegram; veja `image/emoji/README.md` para a atribuição.
