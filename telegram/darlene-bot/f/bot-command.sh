#!/bin/bash

# Init commands

bot.init() {
  local args=($@)

  echo "init --- ${args[@]}"

  case ${args[0]} in
    "/ada") bot.start ${args[@]:1};;
  esac
  
}

bot.start() {
  local args=($@)

  echo "ada --- ${args[@]}"

  [[ -z ${args[@]} ]] && args="0"

  if [[ $(cat ${SCRIPT_CONF} | grep -E "${message_chat_id[$id]}") ]]; then
    ShellBot.editMessageText \
      --chat_id "${message_chat_id[$id]}" \
      --message_id "$(cat ${SCRIPT_CONF} | grep -E "${message_chat_id[$id]}" | cut -d'|' -f1)" \
      --text "rodolfo tiago de $(date +%s)" \
      --parse_mode html
  else
    ShellBot.sendMessage \
      --chat_id ${message_chat_id[$id]} \
      --text "$(echo -e ${args[@]})" \
      --parse_mode html | cut -d'|' -f2,7 | tee ${SCRIPT_CONF} 
  fi
}

bot.new_member() {
  local message

  echo "--- ${my_chat_member_from_id[$id]}"
  message="I was added to the group \`\"${my_chat_member_chat_title[$id]}\"\` \n"
  message+="Please, now promote me to admin"

  ShellBot.sendMessage \
    --chat_id ${my_chat_member_from_id[$id]} \
    --text "$(echo -e ${message})" \
    --parse_mode markdown
}