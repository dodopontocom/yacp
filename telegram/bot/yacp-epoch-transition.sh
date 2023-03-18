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
_metric_slot_in_epoch="cardano_node_metrics_slotInEpoch_int"
_metric_epoch="cardano_node_metrics_epoch_int"

if [[ $(helper._curlgrep ${_metric_slot_in_epoch}) -ge 300 ]]; then

  if [[ ! -f /tmp/1min ]]; then
    if [[ $(($(date "+%s") + (${EPOCH_IN_SECONDS} - $(helper._curlgrep ${_metric_slot_in_epoch})))) -le $(($(date "+%s") + 62)) ]]; then
      message="less than 1 min to epoch transition"
      touch /tmp/1min
    fi
  fi
  if [[ ! -f /tmp/5min ]]; then
    if [[ $(($(date "+%s") + (${EPOCH_IN_SECONDS} - $(helper._curlgrep ${_metric_slot_in_epoch})))) -le $(($(date "+%s") + 300)) ]]; then
      message="less than 5 min to epoch transition"
      touch /tmp/5min
    fi
  fi
  if [[ ! -f /tmp/30min ]]; then
    if [[ $(($(date "+%s") + (${EPOCH_IN_SECONDS} - $(helper._curlgrep ${_metric_slot_in_epoch})))) -le $(($(date "+%s") + 1800)) ]]; then
      message="less than 30 min to epoch transition"
      touch /tmp/30min
    fi
  fi
  if [[ ! -f /tmp/1h ]]; then
    #test ---> 2.5 hour
    if [[ $(($(date "+%s") + (${EPOCH_IN_SECONDS} - $(helper._curlgrep ${_metric_slot_in_epoch})))) -le $(($(date "+%s") + 9000)) ]]; then
    #if [[ $(($(date "+%s") + (${EPOCH_IN_SECONDS} - $(helper._curlgrep ${_metric_slot_in_epoch})))) -le $(($(date "+%s") + 3600)) ]]; then
      message="less than 3 hours to epoch transition"
      touch /tmp/1h

      #send monitoring to telegram
      /home/ubuntu/yacp/telegram/bot/functions/_gnuplot.sh >> /tmp/plot

    fi
  fi
  if [[ ! -f /tmp/5h ]]; then
    if [[ $(($(date "+%s") + (${EPOCH_IN_SECONDS} - $(helper._curlgrep ${_metric_slot_in_epoch})))) -le $(($(date "+%s") + 18000)) ]]; then
      message="less than 5 hours to epoch transition"
      touch /tmp/5h
    fi
  fi

  else
    #epoch just started

    rm /tmp/1min /tmp/5min /tmp/30min /tmp/5h /tmp/1h /tmp/far

    _message="new Epoch ($(helper._curlgrep ${_metric_epoch})) just started"
    curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
	    -d chat_id=${TESTING_CHAT_ID} \
	    -d text="${_message}" \
	    -d parse_mode=HTML

    #execute monitoring
    df -k /dev/sda1 | awk '{print $5}' | egrep "[0-9]" | cut -c-2 | xargs -I {} echo "$(date -d @$(date +\%s) +\%Y-\%m-\%d-\%H:\%M:\%S) {}" >> /home/ubuntu/.yacp-disk
    du -sh /home/ubuntu/cardano-node/db/ | awk '{print $1}' | grep "[0-9]" | tr 'G' '\n' | xargs -I {} echo "$(date -d @$(date +\%s) +\%Y-\%m-\%d-\%H:\%M:\%S) {}" >> /home/ubuntu/.yacp-db
    echo $(($(df -k /dev/sda1 | awk '{print $4}' | egrep "[0-9]") / 1000)) | xargs -I {} echo "$(date -d @$(date +\%s) +\%Y-\%m-\%d-\%H:\%M:\%S) {}" >> /home/ubuntu/.yacp-disk-available-mb
    curl -s localhost:12798/metrics | grep "cardano_node_metrics_txsProcessedNum_int" | awk '{print $2}' | xargs -I {} echo "$(date -d @$(date +\%s) +\%Y-\%m-\%d-\%H:\%M:\%S) {}" >> /home/ubuntu/.yacp-tx
    
    #send monitoring to telegram
    /home/ubuntu/yacp/telegram/bot/functions/_gnuplot.sh >> /tmp/plot

    rm /tmp/db_plot_image.png
	  rm /home/ubuntu/.yacp-db
    rm /tmp/disk_plot_image.png
	  rm /home/ubuntu/.yacp-disk
    rm /tmp/disk_available_plot_image.png
	  rm /home/ubuntu/.yacp-disk-available-mb
    rm /tmp/disk_available_plot_image.png
	  rm /home/ubuntu/.yacp-tx
    rm /tmp/tx_plot_image.png

fi

if [[ ! -z ${message} ]]; then
#send to channel/group/direct
  curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
	  -d chat_id=${TESTING_CHAT_ID} \
	  -d text="${message}" \
	  -d parse_mode=HTML
  elif [[ ! -f /tmp/far ]]; then
    curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
	    -d chat_id=${TESTING_CHAT_ID} \
	    -d text="far from transition" \
	    -d parse_mode=HTML

      touch /tmp/far
fi

if [[ "$(date +%H%M)" == "2300" ]]; then
  rm /tmp/1min /tmp/5min /tmp/30min /tmp/5h /tmp/1h /tmp/far
fi
