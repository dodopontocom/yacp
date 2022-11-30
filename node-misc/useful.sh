#!/usr/bin/env bash
cardano-reload() { CPID=($(pidof cardano-node)); for i in ${CPID[@]}; do kill -SIGHUP ${i}; done ; }
