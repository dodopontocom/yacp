#!/usr/bin/env bash
export BASEDIR="$(cd $(dirname ${BASH_SOURCE[0]}) >/dev/null 2>&1 && pwd)"

_VERSION="0.1 (beta)"

source ${BASEDIR}/.env

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

# curl command to get metrics
helper._curlgrep(){
	curl -sS localhost:12798/metrics | grep ${1} | cut -d' ' -f2	
}
###################################################################################

helper.validate_vars TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID

MESSAGE_ID="3"
_STRONG="<b>"
STRONG_="</b>"
_ITALIC="<i>"
ITALIC_="</i>"
_CODE="<pre>"
CODE_="</pre>"
_SPOILER="<tg-spoiler>"
SPOILER_="</tg-spoiler>"
_NEWLINE="%0A"
_BOT="🤖"
_SPARKLING="✨"
_BR="🇧🇷" # br flag
_INFI="♾"
_TX="📝"
_OK="✅"
_NOK="‼️"
_BLOCK="⛏️"
_BATTLE="⚔️"
_FIRE="🔥"
EPOCH_IN_SECONDS="432000"
EPOCH_IN_HOURS="$(echo $((432000/3600)))"
_metric_epoch="cardano_node_metrics_epoch_int"
_metric_slot_in_epoch="cardano_node_metrics_slotInEpoch_int"
_metric_not_leader="cardano_node_metrics_Forge_node_not_leader_int"
_metric_is_leader="cardano_node_metrics_Forge_node_is_leader_int"
_metric_tx="cardano_node_metrics_txsProcessedNum_int"
_metric_relay_on="cardano_node_metrics_connectedPeers_int"

_check_relay="$(helper._curlgrep ${_metric_relay_on})"
if [[ "${_check_relay}" -eq "1" ]]; then 
    _relay_message="online ${_OK}"
    elif [[ "${_check_relay}" -eq "0" ]]; then
        _relay_message="offline ${_NOK}"
fi

_check_is_leader_int="$(helper._curlgrep ${_metric_is_leader})"
if [[ -z "${_check_is_leader_int}" ]]; then 
    _block_in_epoch_count="0"
    else 
		_block_in_epoch_count="${_check_is_leader_int}"
fi

_epoch_ending_in_hours="$(echo $(((${EPOCH_IN_SECONDS} - $(helper._curlgrep ${_metric_slot_in_epoch})) / 3600)))"

#cardano-cli query leadership-schedule --mainnet --genesis ${NODE_HOME}/shelley-genesis.json \
#	--stake-pool-id $(cat stakepoolid.txt) --vrf-signing-key-file vrf.skey --current

message="
${_STRONG}| ${_BOT} [YACP] LIVE VIEW | version ${_VERSION}${STRONG_}${_NEWLINE}${_NEWLINE}
${_INFI} ${_STRONG}EPOCH ${STRONG_}${_ITALIC}$(helper._curlgrep ${_metric_epoch}) ${_SPARKLING}
[ends in ~${_epoch_ending_in_hours} hours]${ITALIC_}
${_TX} ${_STRONG}Relay Status ${STRONG_}${_ITALIC}${_relay_message}${ITALIC_} ${_SPARKLING}
${_NEWLINE}
${_TX} ${_STRONG}Processed Transaction${STRONG_}
${_ITALIC}$(helper._curlgrep ${_metric_tx})${ITALIC_} ${_SPARKLING}
${_NEWLINE}
${_TX} ${_STRONG}Confirmed Produced Blocks${STRONG_}
${_BLOCK} ${_ITALIC}${_block_in_epoch_count}/22${ITALIC_} ${_SPARKLING}
${_NEWLINE}
${_TX} ${_STRONG}Stolen Blocks${STRONG_}
${_BATTLE} ${_ITALIC}${_block_in_epoch_count} (lost in slot battle)${ITALIC_} ${_SPARKLING}
${_NEWLINE}
${_TX} ${_STRONG}Next Epoch${STRONG_}
${_ITALIC}${_BLOCK} {{ not yet calculated }} (blocks Prediction)${ITALIC_} ${_SPARKLING}
${_NEWLINE}${_NEWLINE}
${_STRONG}| Be Cool ;). YACP team [br${_BR}] |${STRONG_}
________________________________
${_ITALIC}$(date)${ITALIC_}
${_NEWLINE}
Cool Delegators give it a fire ${_FIRE}
"

# send dump message
# get bot updates
# get message_id from this dump message
# update MESSAGE_ID var

#send to channel/group/direct
curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText \
	-d chat_id=${TELEGRAM_CHAT_ID} \
	-d text="${message}" \
	-d parse_mode=HTML \
	-d message_id=${MESSAGE_ID}