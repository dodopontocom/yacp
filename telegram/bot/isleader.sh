#!/usr/bin/env bash

export BASEDIR="$(cd $(dirname ${BASH_SOURCE[0]}) >/dev/null 2>&1 && pwd)"
source ${BASEDIR}/../.env

month=$(date +%B)

#testnet
touch /tmp/isLTestnet
isL=$(sudo journalctl --output=cat -u cardano-node-testnet.service --since "2 minutes ago" | grep -i isLea | cut -d' ' -f11 | cut -d'e' -f1 | tail -1)
if  [[ ! -z ${isL} ]] && [[ ! $(cat /tmp/isLTestnet | grep ${isL}) ]]; then
        curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
                -d chat_id=${TESTING_CHAT_ID} \
                -d text=" 🔥 is Slot Leader on TESTNET" \
                -d parse_mode=HTML

        echo ${isL} > /tmp/isLTestnet
fi

#mainnet
touch /tmp/isLMainnet
isLM=$(sudo journalctl --output=cat -u cardano-node.service --since "2 minutes ago" | grep -i isLea | cut -d' ' -f11 | cut -d'e' -f1 | tail -1)
if  [[ ! -z ${isLM} ]] && [[ ! $(cat /tmp/isLMainnet | grep ${isLM}) ]]; then
        curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
                -d chat_id=${TELEGRAM_CHAT_ID} \
                -d text=" 🔥 is Slot Leader on MAINNET!!! 🔥🔥🔥" \
                -d parse_mode=HTML

        echo ${isLM} > /tmp/isLMainnet
fi

