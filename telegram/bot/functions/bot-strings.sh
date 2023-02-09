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
_BR="🇧🇷" # br flag

be_cool() {
    echo "${_STRONG}.:| Be Cool ;). YACP team [br${_BR}] |:.${STRONG_}"
}

bot.string.start_message() {
    echo "
${_ID} @darlene1_bot\n\n
${_SPEAKER} Hello ${_STRONG}${message_from_first_name[$id]}!!!${STRONG_}
\n\n
Welcome to this bot beta version!\n\n
$(be_cool)
\n
${_CODE}
I am a Cardano Believer! I have some skills all related to Cardano Ecosystem
\n
Check it out:
${CODE_}
\n
/adaprice - sends live Ada price to groups in a pinned message ***
\n
/postadaprice - generates a random cool tweet based on Ada price topic (it uses chatGPT)
\n
/tweet - generates a random cool tweet based on Cardano most recent news (it uses chatGPT)
\n\n
*** commands work better in groups or channels (must add this bot as admin)
\n\n
______________________________________
\n\n
${_STRONG}More skills to come!!!${STRONG_}
\n\n
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
\n
\n
$(be_cool)
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
\n
\n
$(be_cool)
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