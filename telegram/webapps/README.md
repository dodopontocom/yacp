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
│   └── physics.js      # cena Matter.js e ciclo de vida
├── vendor/
│   └── matter-0.20.0.min.js
└── image/
    └── ada-160.png     # textura otimizada para os corpos
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
- O canvas limita o pixel ratio a 2 e ativa sleeping no Matter.js.
- `sendData()` não é usado pela simulação. Ele só funciona em Mini Apps abertas
  por keyboard button e fecha o app após o envio.

## Matter.js

A versão vendorizada é a 0.20.0. `pathseg.js` foi removido porque o app não usa
`Matter.Svg`. A cena é recriada de forma idempotente a cada “Reiniciar”, sem
deixar runners ou canvas antigos ativos.
