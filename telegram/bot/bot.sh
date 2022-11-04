#!/usr/bin/env bash
export BASEDIR="$(cd $(dirname ${BASH_SOURCE[0]}) >/dev/null 2>&1 && pwd)"

[[ -f ${BASEDIR}/../.env ]] || \
  cp ${BASEDIR}/../.env_template ${BASEDIR}/../.env
source ${BASEDIR}/../.env

function_list=($(find ${BASEDIR}/f -name "*.sh"))
for f in ${function_list[@]}; do
    source ${f}
done

helper.validate_vars \
  TELEGRAM_BOT_TOKEN \
  SHELLBOT_GIT_URL \
  SHELLBOT_VERSION_RAW_URL

helper.get_api

source ${BASEDIR}/ShellBot.sh
ShellBot.init --token ${TELEGRAM_BOT_TOKEN} --monitor --flush

_ITALIC="<i>"
ITALIC_="</i>"

while :
do
	ShellBot.getUpdates --limit 100 --offset $(ShellBot.OffsetNext) --timeout 30

  if [[ ! -z ${my_chat_member_new_chat_member_status[$id]} ]]; then
    case ${my_chat_member_new_chat_member_status[$id]} in
      left|kicked) bot.left ;;
      "member") bot.new_member ;;
      "administrator") bot.is_amdin ;;
    esac
  fi

  ticker="ADAUSDT"
  price="USD \$$(curl -sS ${BINANCE_API}${ticker} | jq -r '.price')"
  message="
  📈 ADA -> ${price}
  \n
  -= LIVE ADA PRICE =-
  \n\n\n
  ${args[@]-_____________________________}
  \n
  ${_ITALIC}$(date +"%t%d %b %Y %H:%M:%S")${ITALIC_}
  "
  
  for i in $(cat ${SCRIPT_CONF} | cut -d'|' -f1,2); do
    ShellBot.editMessageText \
      --chat_id "$(echo ${i} | cut -d'|' -f2)" \
      --message_id "$(echo ${i} | cut -d'|' -f1)" \
      --text "$(echo -e ${message})" \
      --parse_mode html
  done

	for id in $(ShellBot.ListUpdates)
	do
	(
    if [[ "$(echo ${message_text[$id]%%@*} | grep "^\/" )" ]] || \
      [[ "$(echo ${channel_post_text[$id]%%@*} | grep "^\/" )" ]]; then
      [[ ! -z ${message_text[$id]} ]] && bot.init ${message_text[$id]}
      [[ ! -z ${channel_post_text[$id]} ]] && bot.init ${channel_post_text[$id]}
    fi
	) &
	done
done
