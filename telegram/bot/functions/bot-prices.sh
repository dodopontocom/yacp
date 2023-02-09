#!/bin/bash

bot.adaprice() {
  local args=($@) message ticker price get_mess message_age_limit

  message_age_limit="172000"

  [[ ! -z ${message_chat_id[$id]} ]] && _chat_id=${message_chat_id[$id]}
  [[ ! -z ${channel_post_chat_id[$id]} ]] && _chat_id=${channel_post_chat_id[$id]}
  [[ ! -z ${channel_post_message_id[$id]} ]] && _message_id=${channel_post_message_id[$id]} && _cut_num=8
  [[ ! -z ${message_message_id[$id]} ]] && _message_id=${message_message_id[$id]} && _cut_num=7

  get_mess="$(cat ${SCRIPT_CONF} | grep -E -- "${_chat_id}" | tail -1)"

  ShellBot.deleteMessage --chat_id ${_chat_id} --message_id ${_message_id}
  _is_permitted=$?

  message=$(bot.string.pinned_message)

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
        | xargs -I {} echo "{}|adaprice|$(date +%Y%mm%dd%Hh%Mm)|$(($(date +%s) + ${message_age_limit}))" >> ${SCRIPT_CONF}

      sleep 3
      ShellBot.pinChatMessage \
        --chat_id "${_chat_id}" \
        --message_id "$(tail -1 ${SCRIPT_CONF} | cut -d'|' -f1)" \
        --disable_notification "true"
    fi
  
  elif [[ ${message_chat_type[$id]} == "private" ]]; then
    message=$(bot.string.message_when_private)

    ShellBot.sendMessage \
      --chat_id ${message_from_id[$id]} \
      --text "$(echo -e ${message})" \
      --parse_mode html
  
  elif [[ ${_is_permitted} != "0" ]]; then
    message=$(bot.string.not_yet_admin)

    ShellBot.sendMessage \
      --chat_id ${_chat_id} \
      --text "$(echo -e ${message})" \
      --parse_mode markdown
  
  elif [[ $(cat ${SCRIPT_CONF} | grep -E -- "${_chat_id}") ]]; then
    message=$(bot.string.price_turn_off)

    ShellBot.sendMessage \
      --chat_id ${_chat_id} \
      --text "$(echo -e ${message})" \
      --parse_mode html

    ShellBot.unpinChatMessage \
    --chat_id ${_chat_id}

    ShellBot.deleteMessage \
    --chat_id ${_chat_id} \
    --message_id "$(cat ${SCRIPT_CONF} | grep -E -- "${_chat_id}" | tail -1 | cut -d'|' -f1)"
    
    sed -i "/${get_mess}/d" ${SCRIPT_CONF}
  fi
}

bot.left() {
  local message get_mess
  get_mess="$(cat ${SCRIPT_CONF} | grep -E -- "${my_chat_member_chat_id[$id]}" | tail -1)"
  message=$(bot.string.left_message)
  ShellBot.sendMessage \
    --chat_id ${my_chat_member_from_id[$id]} \
    --text "$(echo -e ${message})" \
    --parse_mode markdown

  if [[ ! -z ${get_mess} ]]; then
    sed -i "/${get_mess}/d" ${SCRIPT_CONF}
  fi
}

bot.new_member() {
  local message

  message=$(bot.string.new_message)

  ShellBot.sendMessage \
    --chat_id ${my_chat_member_from_id[$id]} \
    --text "$(echo -e ${message})" \
    --parse_mode markdown
}

bot.is_amdin() {
  local message

  message=$(bot.string.admin_message)

  ShellBot.sendMessage \
    --chat_id ${my_chat_member_from_id[$id]} \
    --text "$(echo -e ${message})" \
    --parse_mode markdown
}

bot.recreate_ada_message() {
  local message _chat_id _message_id get_mess message_age_limit

  message_age_limit="172000"

  _chat_id="${1}"
  _message_id="${2}"

  get_mess="$(cat ${SCRIPT_CONF} | grep -E -- "${_chat_id}" | tail -1)"

  message=$(bot.string.pinned_message)

  ShellBot.unpinChatMessage \
    --chat_id ${_chat_id}

  ShellBot.deleteMessage \
    --chat_id "${_chat_id}" \
    --message_id "${_message_id}"
  
  sed -i "/${get_mess}/d" ${SCRIPT_CONF}
  
  ShellBot.sendMessage \
    --chat_id ${_chat_id} \
    --text "$(echo -e ${message})" \
    --parse_mode html | cut -d'|' -f2 \
    | xargs -I {} echo "{}|${_chat_id}|adaprice|$(date +%Y%mm%dd%Hh%Mm)|$(($(date +%s) + ${message_age_limit}))" >> ${SCRIPT_CONF}

  sleep 3
  ShellBot.pinChatMessage \
    --chat_id "${_chat_id}" \
    --message_id "$(tail -1 ${SCRIPT_CONF} | cut -d'|' -f1)" \
    --disable_notification "true"
}