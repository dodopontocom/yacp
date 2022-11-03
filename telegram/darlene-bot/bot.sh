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

while :
do
	ShellBot.getUpdates --limit 100 --offset $(ShellBot.OffsetNext) --timeout 30
  #my_chat_member_chat_type "group\|supergroup\|channel"
  #my_chat_member_chat_id
  #my_chat_member_chat_title
  #my_chat_member_new_chat_member_status "member\|left\|kicked\|administrator"
  #my_chat_member_new_chat_member_status

  if [[ ! -z ${my_chat_member_new_chat_member_status[$id]} ]]; then
    case ${my_chat_member_new_chat_member_status[$id]} in
      left|kicked) echo "left" ;;
      "member") bot.new_member ;;
      "administrator") echo "administrator" ;;
    esac
  fi

  #ShellBot.editMessageText \
  #      --chat_id ${TESTING_CHAT_ID} \
  #      --message_id "18" \
  #      --text "<tg-spoiler>    rodolfo tiago de $(date +%s)    </tg-spoiler>" \
  #      --parse_mode html

	for id in $(ShellBot.ListUpdates)
	do
	(
    if [[ "$(echo ${message_text[$id]%%@*} | grep "^\/" )" ]]; then
      bot.init ${message_text[$id]}
    fi
	) &
	done
done
