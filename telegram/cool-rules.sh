#!/usr/bin/env bash
export BASEDIR="$(cd $(dirname ${BASH_SOURCE[0]}) >/dev/null 2>&1 && pwd)"
source ${BASEDIR}/.env

_STRONG="<b>"
STRONG_="</b>"
_ITALIC="<i>"
ITALIC_="</i>"
_CODE="<pre>"
CODE_="</pre>"
_SPOILER="<tg-spoiler>"
SPOILER_="</tg-spoiler>"
_NEWLINE="%0A"
_BOT="🤖"
_SPARKLING="✨"
_BR="🇧🇷" # br flag
_INFI="♾"
_TX="📝"
_OK="✅"
_NOK="‼️"
_BLOCK="⛏️"
_BATTLE="⚔️"
_FIRE="🔥"
_NAU="🤢"
_COOLB="🆒"
_COOL="😎"
_CHECKED="☑️"

message="
${_STRONG}| ${_COOLB} [YACP] HELP GROUP |${STRONG_}

Huge Welcome to you cool delegators!!!

Please, bear in mind:
Group best way to be cool
- ${_CHECKED} be cool
- ${_CHECKED} be aware of scammers/impersonators ${_NAU}
- ${_CHECKED} [YACP] members never DM you first
- ${_CHECKED} be cool
- ${_CHECKED} [YACP] members are always cool
- ${_CHECKED} do not spam
- ${_CHECKED} ${_COOL}

${_STRONG}| Be Cool ;). YACP team [br${_BR}] |${STRONG_}
________________________________
Cool Delegators give it a fire ${_FIRE}
"

#send to channel/group/direct
curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
	-d chat_id=${YACP_TGROUP} \
	-d text="${message}" \
	-d parse_mode=HTML