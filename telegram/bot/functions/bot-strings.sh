#!/bin/bash

_ITALIC="<i>"
ITALIC_="</i>"
_STRONG="<b>"
STRONG_="</b>"
_BOT="🤖"
_FIRE="🔥"
_INCREASE="📈"
_ID="🆔"
_SPEAKER="🗣"
_SPARKLING="✨"
_CODE="<pre>"
CODE_="</pre>"
_ADA="₳"

bot.string.start_message() {
    echo "
${_ID} @darlene1_bot\n\n
${_SPEAKER} Hello ${_STRONG}${message_from_first_name[$id]}!!!${STRONG_}\n
Welcome to the beta version!\n\n
${_CODE}I am a Cardano Believer! I have the skill to give your group Ada Price updated every minute in a Pinned Message (more skills to come)\n\n
1) Add @darlene1_bot AS ADMIN to your group/channel\n
2) In the group type /adaprice to turn it on\n\n
***) type /adaprice again to turn off\n\n${CODE_}
______________________________________\n\n
Then you will have a pinned message with Ada Price Live Updated!\n\n
${_SPARKLING}
"
}

bot.string.pinned_message() {
    
    price="USD \$$(curl -sS ${BINANCE_API}${ADAPAIR_TICKER} | jq -r '.price')"
  
    echo "
${_INCREASE} ${_ADA} -> ${price}
\n
-= LIVE ADA PRICE =-
\n\n\n
${args[@]-_____________________________}
\n
${_ITALIC} $(date +"%t%d %b %Y %H:%M:%S") UTC ${ITALIC_}
"
}

bot.string.message_when_private(){

    price="USD \$$(curl -sS ${BINANCE_API}${ADAPAIR_TICKER} | jq -r '.price')"
  
    echo "
${_INCREASE} ${_ADA} -> ${price}
\n\n
-= (this command works better in groups or channels) =-
\n\n\n
${args[@]-_____________________________}
\n
${_ITALIC} $(date +"%t%d %b %Y %H:%M:%S") UTC ${ITALIC_}
"
}

bot.string.not_yet_admin() {
    echo "
${_BOT} I still not permitted to perform this task
\n
Please, ask the Admins to promote me as an Admin to this group
"
}

bot.string.price_turn_off() {
    echo "
${_BOT} Live Ada Price, is now turned off
\n\n
_________________________________________
"
}

bot.string.left_message() {
    echo "
${_BOT} Be aware bot has left the group \`\"${my_chat_member_chat_title[$id]}\"\`
"
}

bot.string.new_message() {
    echo "
${_BOT} I am now added to \`\"${my_chat_member_chat_title[$id]}\"\` group
\n
Do not forget to promote me as Admin
"
}

bot.string.admin_message() {
    echo "
${_BOT} I am now promoted to admin on \`\"${my_chat_member_chat_title[$id]}\"\` group
"
}