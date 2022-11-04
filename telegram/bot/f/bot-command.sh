#!/bin/bash

# Init commands

_ITALIC="<i>"
ITALIC_="</i>"
_BOT="🤖"
_FIRE="🔥"
_INCREASE="📈"

bot.init() {
  local args=($@)

  echo "init --- ${args[@]}"

  case ${args[0]} in
    "/adaprice") bot.adaprice ${args[@]:1};;
  esac
  
}

bot.adaprice() {
  local args=($@) message ticker price get_mess

  [[ ! -z ${message_chat_id[$id]} ]] && _chat_id=${message_chat_id[$id]}
  [[ ! -z ${channel_post_chat_id[$id]} ]] && _chat_id=${channel_post_chat_id[$id]}
  [[ ! -z ${channel_post_message_id[$id]} ]] && _message_id=${channel_post_message_id[$id]} && _cut_num=8
  [[ ! -z ${message_message_id[$id]} ]] && _message_id=${message_message_id[$id]} && _cut_num=7

  get_mess="$(cat ${SCRIPT_CONF} | grep -E -- "${_chat_id}" | tail -1)"

  ticker="ADAUSDT"
  price="USD \$$(curl -sS ${BINANCE_API}${ticker} | jq -r '.price')"

  ShellBot.deleteMessage --chat_id ${_chat_id} --message_id ${_message_id}
  _is_permitted=$?

  message="
  ${_INCREASE} ADA -> ${price}
  \n
  -= LIVE ADA PRICE =-
  \n\n\n
  ${args[@]-_____________________________}
  \n
  ${_ITALIC}$(date +"%t%d %b %Y %H:%M:%S")${ITALIC_}
  "

  if [[ ${message_chat_type[$id]} != "private" ]] && \
    [[ ${_is_permitted} == "0" ]] && \
    [[ ! $(cat ${SCRIPT_CONF} | grep -E -- "${_chat_id}") ]]; then
    if [[ $(cat ${SCRIPT_CONF} | grep -E -- "${_chat_id}" | tail -1 | grep -E -- "${_chat_id}\|adaprice") ]]; then
      ShellBot.editMessageText \
        --chat_id "${_chat_id}" \
        --message_id "$(cat ${SCRIPT_CONF} | grep -E -- "${_chat_id}" | tail -1 | cut -d'|' -f1)" \
        --text "$(echo -e ${message})" \
        --parse_mode html
    else
      ShellBot.sendMessage \
        --chat_id ${_chat_id} \
        --text "$(echo -e ${message})" \
        --parse_mode html | cut -d'|' -f2,${_cut_num} \
        | xargs -I {} echo "{}|adaprice|$(date +%Y%mm%dd%Hh%Mm)" >> ${SCRIPT_CONF}

      ShellBot.pinChatMessage \
        --chat_id "${_chat_id}" \
        --message_id "$(tail -1 ${SCRIPT_CONF} | cut -d'|' -f1)"
    fi
  
  elif [[ ${message_chat_type[$id]} == "private" ]]; then
    message="
    ${_BOT} Sorry, this command works only in groups/channels
    \n\n
    ________________________________________________________
    "
    ShellBot.sendMessage \
      --chat_id ${message_from_id[$id]} \
      --text "$(echo -e ${message})" \
      --parse_mode markdown
  
  elif [[ ${_is_permitted} != "0" ]]; then
    message="${_BOT} I still not permitted to perform this task\n"
    message+="Please, ask the Admins to promote me as an Admin to this group"
    ShellBot.sendMessage \
      --chat_id ${_chat_id} \
      --text "$(echo -e ${message})" \
      --parse_mode markdown
  
  elif [[ $(cat ${SCRIPT_CONF} | grep -E -- "${_chat_id}") ]]; then
    message="
    ${_BOT} Live Ada Price, is now turned off
    \n\n
    _________________________________________
    "
    ShellBot.sendMessage \
      --chat_id ${_chat_id} \
      --text "$(echo -e ${message})" \
      --parse_mode markdown

    ShellBot.deleteMessage \
    --chat_id ${_chat_id} \
    --message_id "$(cat ${SCRIPT_CONF} | grep -E -- "${_chat_id}" | tail -1 | cut -d'|' -f1)"
    
    sed -i "/${get_mess}/d" ${SCRIPT_CONF}
  fi
}

bot.left() {
  local message get_mess
  get_mess="$(cat ${SCRIPT_CONF} | grep -E -- "${my_chat_member_chat_id[$id]}" | tail -1)"
  message="${_BOT} Be aware bot has left the group \`\"${my_chat_member_chat_title[$id]}\"\`"
  ShellBot.sendMessage \
    --chat_id ${my_chat_member_from_id[$id]} \
    --text "$(echo -e ${message})" \
    --parse_mode markdown

  sed -i "/${get_mess}/d" ${SCRIPT_CONF}
}

bot.new_member() {
  local message

  message="${_BOT} I am now added to \`\"${my_chat_member_chat_title[$id]}\"\` group\n"
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