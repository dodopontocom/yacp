#!/usr/bin/env bash
cardano-reload() { CPID=$(pidof cardano-node); kill -SIGHUP ${CPID}; echo ${CPID}; }