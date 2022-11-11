#!/usr/bin/env bash
export BASEDIR="$(cd $(dirname ${BASH_SOURCE[0]}) >/dev/null 2>&1 && pwd)"
source ${BASEDIR}/../.env

_VERSION="0.1 (beta)"

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

helper.validate_vars TELEGRAM_BOT_TOKEN TESTING_CHAT_ID

EPOCH_IN_SECONDS=432000
_metric_slot_in_epoch=cardano_node_metrics_slotInEpoch_int

if [[ ! -f /tmp/1min ]]; then
if [[ $(($(date "+%s") + (${EPOCH_IN_SECONDS} - $(helper._curlgrep ${_metric_slot_in_epoch})))) -le $(($(date "+%s") + 62)) ]]; then
	message="1 min to epoch transition"
  touch /tmp/1min
fi
fi
if [[ ! -f /tmp/5min ]]; then
if [[ $(($(date "+%s") + (${EPOCH_IN_SECONDS} - $(helper._curlgrep ${_metric_slot_in_epoch})))) -le $(($(date "+%s") + 300)) ]]; then
	message="5 min to epoch transition"
  touch /tmp/5min
fi
fi
if [[ ! -f /tmp/30min ]]; then
if [[ $(($(date "+%s") + (${EPOCH_IN_SECONDS} - $(helper._curlgrep ${_metric_slot_in_epoch})))) -le $(($(date "+%s") + 1800)) ]]; then
	message="30 min to epoch transition"
  touch /tmp/30min
fi
fi
if [[ ! -f /tmp/5h ]]; then
if [[ $(($(date "+%s") + (${EPOCH_IN_SECONDS} - $(helper._curlgrep ${_metric_slot_in_epoch})))) -le $(($(date "+%s") + 18000)) ]]; then
	message="5 hours to epoch transition"
  touch /tmp/5h
fi
fi

if [[ ! -z ${message} ]]; then
#send to channel/group/direct
  curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
	  -d chat_id=${TESTING_CHAT_ID} \
	  -d text="${message}" \
	  -d parse_mode=HTML
  else
    curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
	    -d chat_id=${TESTING_CHAT_ID} \
	    -d text="far from transition" \
	    -d parse_mode=HTML
fi

if [[ "$(date +%H%M)" == "2300" ]]; then
  rm /tmp/1min /tmp/5min /tmp/30min /tmp/5h
fi
