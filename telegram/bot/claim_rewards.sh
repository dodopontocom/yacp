#!/usr/bin/env bash

export BASEDIR="$(cd $(dirname ${BASH_SOURCE[0]}) >/dev/null 2>&1 && pwd)"
source ${BASEDIR}/../.env
#source /home/ubuntu/.bashrc

magic="--mainnet"
files=$2
if [[ "$1" == "testnet" ]]; then

	CARDANO_NODE_SOCKET_PATH=/home/ubuntu/testnet/cardano-node/db/socket
	magic="--testnet-magic 1"
fi

currentSlot=$(/usr/local/bin/cardano-cli query tip ${magic} | jq -r '.slot')
echo Current Slot: $currentSlot

rewardBalance=$(cardano-cli query stake-address-info \
	${magic} \
	--address $(cat ${files}/stake.addr) | jq -r ".[0].rewardAccountBalance")
echo rewardBalance: ${rewardBalance}

destinationAddress=$(cat ${files}/paymentwithstake.addr)
echo destinationAddress: $destinationAddress

cardano-cli query utxo \
	    --address $(cat ${files}/paymentwithstake.addr) \
	        ${magic} > fullUtxo.out

tail -n +3 fullUtxo.out | sort -k3 -nr > balance.out

cat balance.out

tx_in=""
total_balance=0
while read -r utxo; do
    type=$(awk '{ print $6 }' <<< "${utxo}")
    if [[ ${type} == 'TxOutDatumNone' ]]
    then
	in_addr=$(awk '{ print $1 }' <<< "${utxo}")
	idx=$(awk '{ print $2 }' <<< "${utxo}")
	utxo_balance=$(awk '{ print $3 }' <<< "${utxo}")
	total_balance=$((${total_balance}+${utxo_balance}))
	echo TxHash: ${in_addr}#${idx}
	echo ADA: ${utxo_balance}
	tx_in="${tx_in} --tx-in ${in_addr}#${idx}"
    fi
done < balance.out
txcnt=$(cat balance.out | wc -l)
echo Total available ADA balance: ${total_balance}
echo Number of UTXOs: ${txcnt}
withdrawalString="$(cat ${files}/stake.addr)+${rewardBalance}"

if [[ ${rewardBalance} -ge 1000000000 ]]; then
	echo "lets claim rewards just now"
	curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
		-d chat_id=${TESTING_CHAT_ID} \
		-d text="Stake Owner reward: ${rewardBalance}" \
		-d parse_mode=HTML

#############
#exit -1
#############

cardano-cli transaction build-raw \
    ${tx_in} \
    --tx-out $(cat ${files}/paymentwithstake.addr)+0 \
    --invalid-hereafter $(( ${currentSlot} + 10000)) \
    --fee 0 \
    --withdrawal ${withdrawalString} \
    --out-file tx.tmp

fee=$(cardano-cli transaction calculate-min-fee \
	--tx-body-file tx.tmp \
	--tx-in-count ${txcnt} \
	--tx-out-count 1 \
	${magic} \
	--witness-count 2 \
	--byron-witness-count 0 \
	--protocol-params-file ${files}/params.json | awk '{ print $1 }')
echo fee: $fee

txOut=$((${total_balance}-${fee}+${rewardBalance}))
echo Change Output: ${txOut}

cardano-cli transaction build-raw \
    ${tx_in} \
    --tx-out $(cat ${files}/paymentwithstake.addr)+${txOut} \
    --invalid-hereafter $(( ${currentSlot} + 10000)) \
    --fee ${fee} \
    --withdrawal ${withdrawalString} \
    --out-file tx.raw

cardano-cli transaction sign \
   --tx-body-file tx.raw \
   --signing-key-file ${files}/payment.skey \
   --signing-key-file ${files}/stake.skey \
   ${magic} \
   --out-file tx.signed

cardano-cli transaction submit \
   --tx-file tx.signed \
   ${magic}

cardano-cli query utxo \
   --address ${destinationAddress} \
   ${magic}

	curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
		-d chat_id=${TESTING_CHAT_ID} \
		-d text="Stake Owner reward done" \
		-d parse_mode=HTML

else
	echo "lets claim rewards later on"
	curl -s -X POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage \
		-d chat_id=${TESTING_CHAT_ID} \
		-d text="Stake Owner reward: ${rewardBalance}" \
		-d parse_mode=HTML

fi

