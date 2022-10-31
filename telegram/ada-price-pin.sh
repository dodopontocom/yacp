#!/usr/bin/env bash
export BASEDIR="$(cd $(dirname ${BASH_SOURCE[0]}) >/dev/null 2>&1 && pwd)"
source ${BASEDIR}/.env

######script helper functions ####################################################
# check if required variables are exported
helper.validate_vars() {
  local vars_list=($@)
        
  for v in $(echo ${vars_list[@]}); do
    export | grep ${v} > /dev/null
    result=$?
    if [[ ${result} -ne 0 ]]; then
      echo "Dependency of ${v} is missing"
	  echo "Please, export ${v} before running the script"
      echo "Exiting..."
      exit -1
    fi
  done
}

# curl command to get metrics
helper._curlgrep(){
	curl -sS localhost:12798/metrics | grep ${1} | cut -d' ' -f2	
}
###################################################################################

helper.validate_vars TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID

binance_api="https://api.binance.com/api/v3/ticker/price?symbol=ADAUSDT"
price=$(curl -sS ${binance_api} | jq -r '.price')

CHANNEL_MESSAGE_ID="17"
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
_INCREASE="📈"
_ROCKET="🚀"

message="
${_STRONG}| ${_INCREASE} USD \$${price} | LIVE ADA${STRONG_}


________________________________
${_ITALIC}$(date)${ITALIC_}
${_NEWLINE}
Cool Delegators give it a fire ${_FIRE}
"

# send dump message
# get bot updates
# get message_id from this dump message
# update MESSAGE_ID var

#send to channel/group/direct
curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText \
	-d chat_id=${TELEGRAM_CHAT_ID} \
	-d text="${message}" \
	-d parse_mode=HTML \
	-d message_id=${CHANNEL_MESSAGE_ID}
