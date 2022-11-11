#!/usr/bin/env bash

export BASEDIR="$(cd $(dirname ${BASH_SOURCE[0]}) >/dev/null 2>&1 && pwd)"
source ${BASEDIR}/../../.env

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

#25 */2 * * * df -k /dev/sda1 | awk '{print $5}' | egrep "[0-9]" | cut -c-2 | xargs -I {} echo "$(date -d @$(date +\%s) +\%Y-\%m-\%d-\%H:\%M:\%S) {}" >> /home/ubuntu/.yacp-disk
#30 */2 * * * du -sh /home/ubuntu/cardano-node/db/ | awk '{print $1}' | grep "[0-9]" | tr 'G' '\n' | xargs -I {} echo "$(date -d @$(date +\%s) +\%Y-\%m-\%d-\%H:\%M:\%S) {}" >> /home/ubuntu/.yacp-db

/usr/bin/gnuplot /home/ubuntu/db_plot.gp
/usr/bin/gnuplot /home/ubuntu/disk_plot.gp
/usr/bin/gnuplot /home/ubuntu/disk_available_plot.gp
/usr/bin/gnuplot /home/ubuntu/tx_plot.gp

if [[ -f "/tmp/db_plot_image.png" ]]; then
	curl -sS https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendphoto -F chat_id=${TESTING_CHAT_ID} -F photo=@/tmp/db_plot_image.png
fi

if [[ -f "/tmp/disk_plot_image.png" ]]; then
	curl -sS https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendphoto -F chat_id=${TESTING_CHAT_ID} -F photo=@/tmp/disk_plot_image.png
fi

if [[ -f "/tmp/disk_available_plot_image.png" ]]; then
	curl -sS https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendphoto -F chat_id=${TESTING_CHAT_ID} -F photo=@/tmp/disk_available_plot_image.png
fi

if [[ -f "/tmp/tx_plot_image.png" ]]; then
	curl -sS https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendphoto -F chat_id=${TESTING_CHAT_ID} -F photo=@/tmp/tx_plot_image.png
fi