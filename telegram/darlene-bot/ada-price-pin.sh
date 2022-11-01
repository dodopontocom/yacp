#!/usr/bin/env bash
export BASEDIR="$(cd $(dirname ${BASH_SOURCE[0]}) >/dev/null 2>&1 && pwd)"
source ${BASEDIR}/../.env

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
###################################################################################

helper.validate_vars TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID SCRIPT_CONF

[[ -f ${SCRIPT_CONF} ]] || touch ${SCRIPT_CONF}

binance_api="https://api.binance.com/api/v3/ticker/price?symbol=ADAUSDT"
price=$(curl -sS ${binance_api} | jq -r '.price')

_STRONG="<b>"
STRONG_="</b>"
_ITALIC="<i>"
ITALIC_="</i>"
_NEWLINE="%0A"
_BOT="🤖"
_FIRE="🔥"
_INCREASE="📈"

message="
${_STRONG}| ${_INCREASE} USD \$${price} | LIVE ADA${STRONG_}

${_BOT} yes, ada price live updated in pinned message! isn't it cool?
___________________________________
${_ITALIC}$(date)${ITALIC_}
${_NEWLINE}
Cool Delegators give it a fire ${_FIRE}
"

if [[ "$(cat ${SCRIPT_CONF})" -eq "" ]]; then
  _pholder="$(date +%s)"
  CHANNEL_MESSAGE_ID=$(curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
  	-d chat_id=${TELEGRAM_CHAT_ID} \
	  -d text="${_pholder}" \
	  -d parse_mode=HTML | jq -r '.result.message_id')
    echo "${CHANNEL_MESSAGE_ID}" > ${SCRIPT_CONF}

    else
      CHANNEL_MESSAGE_ID=$(cat ${SCRIPT_CONF})
fi

#send to channel/group/direct
curl -sS -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText \
 -d chat_id=${TELEGRAM_CHAT_ID} \
	-d text="${message}" \
	-d parse_mode=HTML \
	-d message_id=${CHANNEL_MESSAGE_ID} > /dev/null
