#!/bin/bash

# Init commands

bot.init() {
  local args=($@)

  echo "init --- ${args[@]}"

  case ${args[0]} in
    /adaprice|/adaprice@darlene1_bot) bot.adaprice ${args[@]:1};;
    /start|/start@darlene1_bot) bot.start ${args[@]:1};;
  esac
  
}

bot.start() {
  local message args=($@) 
  message=$(bot.string.start_message)
  
  if [[ ${message_chat_type[$id]} == "private" ]]; then  
  	ShellBot.sendMessage \
      --chat_id ${message_chat_id[$id]} \
	  	--text "$(echo -e ${message})" \
      --parse_mode html
  fi
}
