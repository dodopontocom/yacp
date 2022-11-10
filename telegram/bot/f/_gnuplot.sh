#!/usr/bin/env bash

#25 */2 * * * df -k /dev/sda1 | awk '{print $5}' | egrep "[0-9]" | cut -c-2 | xargs -I {} echo "$(date -d @$(date +\%s) +\%Y-\%m-\%d-\%H:\%M:\%S) {}" >> /home/ubuntu/.yacp-disk
#30 */2 * * * du -sh /home/ubuntu/cardano-node/db/ | awk '{print $1}' | grep "[0-9]" | tr 'G' '\n' | xargs -I {} echo "$(date -d @$(date +\%s) +\%Y-\%m-\%d-\%H:\%M:\%S) {}" >> /home/ubuntu/.yacp-db

/usr/bin/gnuplot /home/ubuntu/db_plot.gp
/usr/bin/gnuplot /home/ubuntu/disk_plot.gp
/usr/bin/gnuplot /home/ubuntu/disk_available_plot.gp
/usr/bin/gnuplot /home/ubuntu/tx_plot.gp

if [[ -f "/tmp/db_plot_image.png" ]]; then
	curl -sS https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendphoto -F chat_id=${TESTING_CHAT_ID} -F photo=@/tmp/db_plot_image.png
	rm /tmp/db_plot_image.png
	rm /home/ubuntu/.yacp-db
fi

if [[ -f "/tmp/disk_plot_image.png" ]]; then
	curl -sS https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendphoto -F chat_id=${TESTING_CHAT_ID} -F photo=@/tmp/disk_plot_image.png
	rm /tmp/disk_plot_image.png
	rm /home/ubuntu/.yacp-disk
fi

if [[ -f "/tmp/disk_available_plot_image.png" ]]; then
	curl -sS https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendphoto -F chat_id=${TESTING_CHAT_ID} -F photo=@/tmp/disk_available_plot_image.png
	rm /tmp/disk_available_plot_image.png
	rm /home/ubuntu/.yacp-disk-available-mb
fi

if [[ -f "/tmp/tx_plot_image.png" ]]; then
	curl -sS https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendphoto -F chat_id=${TESTING_CHAT_ID} -F photo=@/tmp/tx_plot_image.png
	rm /tmp/disk_available_plot_image.png
	rm /home/ubuntu/.yacp-tx
fi
