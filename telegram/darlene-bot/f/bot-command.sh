#!/bin/bash

# Init commands

_ITALIC="<i>"
ITALIC_="</i>"

bot.init() {
  local args=($@)

  echo "init --- ${args[@]}"

  case ${args[0]} in
    "/ada") bot.ada ${args[@]:1};;
  esac
  
}

bot.ada() {
  local args=($@) message ticker price

  ticker="ADAUSDT"
  price="USD \$$(curl -sS ${BINANCE_API}${ticker} | jq -r '.price')"

  ShellBot.deleteMessage --chat_id ${message_chat_id[$id]} --message_id ${message_message_id[$id]}
  _is_permitted=$?

  message="
  📈 ADA -> ${price}
  \n
  -= LIVE ADA PRICE =-
  \n\n\n
  ${args[@]-_____________________________}
  \n
  ${_ITALIC}$(date +"%t%d %b %Y %H:%M:%S")${ITALIC_}
  "

  if [[ ${message_chat_type[$id]} != "private" ]] && \
    [[ ${_is_permitted} == "0" ]]; then
    if [[ $(cat ${SCRIPT_CONF} | grep -E -- "${message_chat_id[$id]}" | tail -1 | grep -E -- "${message_chat_id[$id]}\|ada") ]]; then
      ShellBot.editMessageText \
        --chat_id "${message_chat_id[$id]}" \
        --message_id "$(cat ${SCRIPT_CONF} | grep -E -- "${message_chat_id[$id]}" | tail -1 | cut -d'|' -f1)" \
        --text "$(echo -e ${message})" \
        --parse_mode html
    else
      ShellBot.sendMessage \
        --chat_id ${message_chat_id[$id]} \
        --text "$(echo -e ${message})" \
        --parse_mode html | cut -d'|' -f2,7 \
        | xargs -I {} echo "{}|ada|$(date +%Y%mm%dd%Hh%Mm)" >> ${SCRIPT_CONF}

      ShellBot.pinChatMessage \
        --chat_id "${message_chat_id[$id]}" \
        --message_id "$(tail -1 ${SCRIPT_CONF} | cut -d'|' -f1)"
    fi
  
  elif [[ ${message_chat_type[$id]} == "private" ]]; then
    message="Sorry, this command works only in groups/channels"
    ShellBot.sendMessage \
      --chat_id ${message_from_id[$id]} \
      --text "$(echo -e ${message})" \
      --parse_mode html
  
  elif [[ ${_is_permitted} != "0" ]]; then
    message="I still not permitted to perform this task\n"
    message+="Please, ask the Admins to promote me as an Admin to this group"
    ShellBot.sendMessage \
      --chat_id ${message_chat_id[$id]} \
      --text "$(echo -e ${message})" \
      --parse_mode html

  fi
}

bot.left() {
  local message get_mess
  get_mess="$(cat ${SCRIPT_CONF} | grep -E -- "${my_chat_member_chat_id[$id]}" | grep -v "left" | tail -1 | cut -d'|' -f1)"
  message="Be aware bot has left the group \`\"${my_chat_member_chat_title[$id]}\"\`"
  ShellBot.sendMessage \
    --chat_id ${my_chat_member_from_id[$id]} \
    --text "$(echo -e ${message})" \
    --parse_mode markdown | cut -d'|' -f2,7 \
    | xargs -I {} echo "{}|${my_chat_member_chat_id[$id]}|left|${get_mess}|$(date +%Y%mm%dd%Hh%Mm)" >> ${SCRIPT_CONF}
}

bot.new_member() {
  local message

  message="I am now added to \`\"${my_chat_member_chat_title[$id]}\"\` group\n"
  message+="Do not forget to promote me as Admin"

  ShellBot.sendMessage \
    --chat_id ${my_chat_member_from_id[$id]} \
    --text "$(echo -e ${message})" \
    --parse_mode markdown
}

bot.is_amdin() {
  local message

  message="I am now promoted to admin on \`\"${my_chat_member_chat_title[$id]}\"\` group\n"

  ShellBot.sendMessage \
    --chat_id ${my_chat_member_from_id[$id]} \
    --text "$(echo -e ${message})" \
    --parse_mode markdown
}